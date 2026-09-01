import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  Edit2,
  User,
  ShieldCheck,
  RotateCcw,
  History,
  ArrowRight,
  Paperclip,
  Link,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react';

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
  notes?: string;
  size?: number;
  uploadedAt: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'pending' | 'in progress' | 'approved' | 'rejected' | 'canceled' | 'revision';
  division: 'IT' | 'Finance' | 'Business';
  currentStepOrder: number;
  workflowVersion: number;
  notes?: string;
  attachments?: TaskAttachment[];
  createdAt: string;
  creator?: {
    id: string;
    username: string;
    fullName?: string;
    role: string;
    division: string;
  };
  workflow?: {
    id: string;
    name: string;
    version: number;
  };
  approvals?: any[];
  histories?: any[];
  snapshotWorkflowSteps?: any[];
  canApprove?: boolean;
  isOwnTask?: boolean;
}

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  // Selected Task
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    division: user?.division || 'IT',
    workflowId: '',
    notes: '',
  });

  const [formAttachments, setFormAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | 'REVISION'>('APPROVED');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');

  // Revision Modal State
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    revisionNotes: '',
  });

  const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [comboboxDivisions, setComboboxDivisions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          division: divisionFilter || undefined,
        },
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [wfRes, usersRes, comboRes] = await Promise.all([
        api.get('/workflows?activeOnly=true'),
        api.get('/tasks/delegates/candidates'),
        api.get('/combobox'),
      ]);
      setAvailableWorkflows(wfRes.data);
      setAvailableUsers(usersRes.data);
      setComboboxDivisions(comboRes.data.divisions || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, divisionFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleOpenCreate = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'MEDIUM',
      division: user?.division || 'IT',
      workflowId: availableWorkflows[0]?.id || '',
      notes: '',
    });
    setFormAttachments([]);
    setErrorMessage(null);
    setCreateModalOpen(true);
  };

  const handleAddLinkAttachment = () => {
    const newId = 'link-' + Date.now();
    setFormAttachments([
      ...formAttachments,
      {
        id: newId,
        name: 'Web / Document Reference Link',
        url: '',
        type: 'link',
        notes: '',
        uploadedAt: new Date().toISOString(),
      },
    ]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await api.post('/tasks/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormAttachments([
        ...formAttachments,
        {
          id: 'file-' + Date.now(),
          name: res.data.fileName,
          url: res.data.downloadUrl,
          type: 'file',
          notes: '',
          size: res.data.size,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setFormAttachments(formAttachments.filter((a) => a.id !== id));
  };

  const handleAttachmentChange = (id: string, field: 'url' | 'notes', val: string) => {
    setFormAttachments(
      formAttachments.map((a) => (a.id === id ? { ...a, [field]: val } : a)),
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const cleanAttachments = formAttachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        type: a.type,
        notes: a.notes || '',
        size: a.size,
        uploadedAt: a.uploadedAt,
      }));

      const payload: any = {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        division: taskForm.division,
        attachments: cleanAttachments,
      };
      if (taskForm.workflowId && taskForm.workflowId.trim() !== '') {
        payload.workflowId = taskForm.workflowId;
      }
      if (taskForm.notes && taskForm.notes.trim() !== '') {
        payload.notes = taskForm.notes;
      }
      await api.post('/tasks', payload);
      setCreateModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleOpenDetail = async (task: TaskItem) => {
    try {
      const res = await api.get(`/tasks/${task.id}`);
      setSelectedTask(res.data);
      setDetailModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load task details');
    }
  };

  const handleOpenEditModal = async (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.get(`/tasks/${task.id}`);
      const freshTask = res.data;
      setEditingTask(freshTask);
      setTaskForm({
        title: freshTask.title,
        description: freshTask.description,
        priority: freshTask.priority,
        division: freshTask.division,
        workflowId: freshTask.workflow?.id || '',
        notes: freshTask.notes || '',
      });
      setFormAttachments(Array.isArray(freshTask.attachments) ? freshTask.attachments : []);
      setErrorMessage(null);
      setEditModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load task details for editing');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setErrorMessage(null);
    try {
      const cleanAttachments = formAttachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        type: a.type,
        notes: a.notes || '',
        size: a.size,
        uploadedAt: a.uploadedAt,
      }));

      const payload: any = {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        division: taskForm.division,
        attachments: cleanAttachments,
      };
      if (taskForm.notes && taskForm.notes.trim() !== '') {
        payload.notes = taskForm.notes;
      }
      await api.put(`/tasks/${editingTask.id}`, payload);
      setEditModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleOpenApproveModal = (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTask(task);
    setDetailModalOpen(false); // Close detail modal so approval modal is in focus
    setApprovalDecision('APPROVED');
    setApprovalNotes('');
    setErrorMessage(null);
    setApproveModalOpen(true);
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/approve`, {
        decision: approvalDecision,
        notes: approvalNotes,
      });
      setApproveModalOpen(false);
      setDetailModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to process approval');
    }
  };

  const handleOpenRevisionModal = (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTask(task);
    setRevisionForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      revisionNotes: '',
    });
    setErrorMessage(null);
    setRevisionModalOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/submit-revision`, revisionForm);
      setRevisionModalOpen(false);
      setDetailModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit revision');
    }
  };

  const handleOpenCancelModal = (task: TaskItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTask(task);
    setCancelNotes('');
    setErrorMessage(null);
    setCancelModalOpen(true);
  };

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/cancel`, { notes: cancelNotes });
      setCancelModalOpen(false);
      setDetailModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to cancel task');
    }
  };

  const handleOpenReassignModal = async (approvalId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedApprovalId(approvalId);
    setReassignNotes('');
    setErrorMessage(null);

    // Fetch latest candidate approvers
    try {
      const res = await api.get('/tasks/delegates/candidates');
      setAvailableUsers(res.data);
      if (res.data.length > 0) {
        setReassignUserId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }

    setReassignModalOpen(true);
  };

  const handleSubmitReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalId) return;
    try {
      await api.post(`/tasks/approvals/${selectedApprovalId}/reassign`, {
        newApproverId: reassignUserId,
        notes: reassignNotes,
      });
      setReassignModalOpen(false);
      if (selectedTask) {
        handleOpenDetail(selectedTask);
      }
      fetchTasks();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to reassign approval');
    }
  };

  const handleDeleteTask = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete task "${title}"?`)) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'in progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <RotateCcw className="w-3.5 h-3.5" /> Canceled
          </span>
        );
      case 'revision':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> Needs Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-slate-100 text-slate-700',
      MEDIUM: 'bg-blue-50 text-blue-700',
      HIGH: 'bg-orange-50 text-orange-700',
      URGENT: 'bg-red-100 text-red-800 font-bold',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.MEDIUM}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            Task Management & Approval
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Role-isolated tasks, multi-level sequential progression, and action approvals
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task title or description..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in progress">In Progress</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="canceled">Canceled</option>
        </select>

        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Divisions</option>
          {comboboxDivisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Task Cards & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Task Details</th>
                <th className="px-6 py-4">Creator / Div</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status & Stage</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No tasks found. Create a new task to get started!
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => handleOpenDetail(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{t.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-bold">{t.creator?.fullName || t.creator?.username || 'System'}</div>
                      <div className="text-xs text-slate-400 font-medium">@{t.creator?.username} • {t.division} Division</div>
                    </td>
                    <td className="px-6 py-4">{getPriorityBadge(t.priority)}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(t.status)}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          Stage {t.currentStepOrder} of {t.snapshotWorkflowSteps?.length || 1} (v{t.workflowVersion})
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {/* Document rule: Tombol approval hanya keluar untuk user yang memiliki hak approval, tidak untuk task sendiri */}
                      {t.canApprove && t.status !== 'revision' && (
                        <button
                          onClick={(e) => handleOpenApproveModal(t, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Approve / Reject</span>
                        </button>
                      )}

                      {/* Tombol Revisi untuk Staff/Creator ketika status Revision */}
                      {(t.isOwnTask || user?.role === 'Admin') && t.status === 'revision' && (
                        <button
                          onClick={(e) => handleOpenRevisionModal(t, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Submit Revision</span>
                        </button>
                      )}

                      {/* Tombol Edit Task selama status Pending */}
                      {(t.isOwnTask || user?.role === 'Admin') && t.status === 'pending' && (
                        <button
                          onClick={(e) => handleOpenEditModal(t, e)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Pending Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {(t.isOwnTask || user?.role === 'Admin') && t.status !== 'approved' && t.status !== 'canceled' && (
                        <button
                          onClick={(e) => handleOpenCancelModal(t, e)}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-medium"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenDetail(t)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {(t.isOwnTask || user?.role === 'Admin') && (
                        <button
                          onClick={(e) => handleDeleteTask(t.id, t.title, e)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Task */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create New Approval Task</h2>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Pembelian Software Cloud License Q3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Description / Justification
                </label>
                <textarea
                  rows={3}
                  required
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Explain why this request is required..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Division
                  </label>
                  <select
                    value={taskForm.division}
                    onChange={(e) => setTaskForm({ ...taskForm, division: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {comboboxDivisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Approval Workflow Template
                </label>
                <select
                  value={taskForm.workflowId}
                  onChange={(e) => setTaskForm({ ...taskForm, workflowId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Default Corporate Flow (Staff &rarr; Manager &rarr; Direktur)</option>
                  {availableWorkflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (v{w.version})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attachments and Links Section */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Attachments & Reference Links
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{uploadingFile ? 'Uploading...' : 'Add File'}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={handleFileUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLinkAttachment}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>

                {formAttachments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center border border-dashed border-slate-200">
                    No attachments or links added yet. Click &ldquo;Add File&rdquo; or &ldquo;Add Link&rdquo; above.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {formAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                            {att.type === 'file' ? (
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Link className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            )}
                            <span className="truncate">{att.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {att.type === 'link' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-slate-500 block mb-0.5 text-[11px]">Link URL</label>
                              <input
                                type="url"
                                required
                                value={att.url}
                                onChange={(e) => handleAttachmentChange(att.id, 'url', e.target.value)}
                                placeholder="https://example.com/spec.pdf"
                                className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 block mb-0.5 text-[11px]">Link Notes</label>
                              <input
                                type="text"
                                value={att.notes || ''}
                                onChange={(e) => handleAttachmentChange(att.id, 'notes', e.target.value)}
                                placeholder="Notes about this link..."
                                className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-slate-500 block mb-0.5 text-[11px]">Attachment Notes</label>
                            <input
                              type="text"
                              value={att.notes || ''}
                              onChange={(e) => handleAttachmentChange(att.id, 'notes', e.target.value)}
                              placeholder="Notes about this file..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Initial Notes (Optional)
                </label>
                <input
                  type="text"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Notes for approvers..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Submit Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Task (Pending Status) */}
      {editModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Pending Task</h2>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Description / Justification
                </label>
                <textarea
                  rows={3}
                  required
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Division
                  </label>
                  <select
                    value={taskForm.division}
                    onChange={(e) => setTaskForm({ ...taskForm, division: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {comboboxDivisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments and Links Section */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Attachments & Reference Links
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{uploadingFile ? 'Uploading...' : 'Add File'}</span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingFile}
                        onChange={handleFileUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLinkAttachment}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                    >
                      <Link className="w-3.5 h-3.5" />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>

                {formAttachments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center border border-dashed border-slate-200">
                    No attachments or links added yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {formAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                            {att.type === 'file' ? (
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Link className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            )}
                            <span className="truncate">{att.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {att.type === 'link' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-slate-500 block mb-0.5 text-[11px]">Link URL</label>
                              <input
                                type="url"
                                required
                                value={att.url}
                                onChange={(e) => handleAttachmentChange(att.id, 'url', e.target.value)}
                                placeholder="https://example.com/spec.pdf"
                                className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 block mb-0.5 text-[11px]">Link Notes</label>
                              <input
                                type="text"
                                value={att.notes || ''}
                                onChange={(e) => handleAttachmentChange(att.id, 'notes', e.target.value)}
                                placeholder="Notes about this link..."
                                className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-slate-500 block mb-0.5 text-[11px]">Attachment Notes</label>
                            <input
                              type="text"
                              value={att.notes || ''}
                              onChange={(e) => handleAttachmentChange(att.id, 'notes', e.target.value)}
                              placeholder="Notes about this file..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Update Notes (Optional)
                </label>
                <input
                  type="text"
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Notes about what was modified..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Process Approval (Approve / Reject) */}
      {approveModalOpen && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Process Task Approval</h2>
            <p className="text-xs text-slate-500 mb-4">{selectedTask.title}</p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Approval Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('APPROVED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      approvalDecision === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('REVISION')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      approvalDecision === 'REVISION'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Revision
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('REJECTED')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      approvalDecision === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Approval / Revision Reason Notes {approvalDecision !== 'APPROVED' && '(Required)'}
                </label>
                <textarea
                  rows={3}
                  required={approvalDecision !== 'APPROVED'}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={
                    approvalDecision === 'REVISION'
                      ? 'Catatan bagian mana yang perlu direvisi oleh staff...'
                      : 'Provide review notes or justification...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApproveModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-sm font-semibold shadow transition ${
                    approvalDecision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : approvalDecision === 'REVISION'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Task Detail & Approval Flow Progression */}
      {detailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {getStatusBadge(selectedTask.status)}
                  {getPriorityBadge(selectedTask.priority)}
                  <span className="text-xs text-slate-400 font-medium">
                    Workflow v{selectedTask.workflowVersion}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Requester / Creator</span>
                <p className="font-semibold text-slate-800 text-sm">{selectedTask.creator?.username}</p>
                <p className="text-slate-500">{selectedTask.creator?.role} • {selectedTask.creator?.division}</p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Assigned Division</span>
                <p className="font-semibold text-slate-800 text-sm">{selectedTask.division}</p>
                <p className="text-slate-500">Workflow: {selectedTask.workflow?.name || 'Multi-Level'}</p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Submission Date</span>
                <p className="font-semibold text-slate-800 text-sm">
                  {new Date(selectedTask.createdAt).toLocaleString()}
                </p>
                <p className="text-slate-500">Current Stage: Level {selectedTask.currentStepOrder}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/80 leading-relaxed">
                {selectedTask.description}
              </p>
              {selectedTask.notes && (
                <p className="text-xs text-slate-500 italic mt-2">Notes: {selectedTask.notes}</p>
              )}
            </div>

            {/* Task Attachments & Links in Detail View */}
            {Array.isArray(selectedTask.attachments) && selectedTask.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  Attachments & Reference Links ({selectedTask.attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTask.attachments.map((att: any, idx: number) => {
                    if (!att) return null;
                    const isFile = att.type === 'file';
                    const linkTarget = att.url
                      ? att.url.startsWith('http://') || att.url.startsWith('https://')
                        ? att.url
                        : `https://${att.url}`
                      : '#';

                    return (
                      <div
                        key={att.id || idx}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between text-xs space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            {isFile ? (
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Link className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            )}
                            <span className="font-bold text-slate-800 truncate" title={att.name || 'Attachment'}>
                              {att.name || (isFile ? 'Uploaded File' : 'Reference Link')}
                            </span>
                          </div>
                          {att.size ? (
                            <span className="text-[11px] font-medium text-slate-400 flex-shrink-0 bg-slate-200/60 px-1.5 py-0.5 rounded">
                              {(att.size / 1024).toFixed(0)} KB
                            </span>
                          ) : null}
                        </div>

                        {/* Display Notes clearly for both file and link */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                            {isFile ? '📎 Attachment Notes:' : '🔗 Link Notes:'}
                          </span>
                          <p className="text-slate-800 font-medium whitespace-pre-wrap">
                            {att.notes && att.notes.trim() !== '' ? att.notes : <span className="text-slate-400 italic font-normal">Tidak ada catatan</span>}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2">
                          {isFile ? (
                            <a
                              href={`http://localhost:3000${att.url || ''}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition cursor-pointer shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download File</span>
                            </a>
                          ) : (
                            <a
                              href={linkTarget}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition cursor-pointer shadow-xs hover:shadow"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open URL Link</span>
                            </a>
                          )}
                          {!isFile && att.url && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[170px]" title={att.url}>
                              {att.url}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Visual Workflow Progression */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Approval Chain Progression (Multi-Level & Any/All Logic)
              </h3>

              <div className="space-y-3">
                {selectedTask.snapshotWorkflowSteps?.map((step: any) => {
                  const isCurrent = selectedTask.currentStepOrder === step.stepOrder && selectedTask.status === 'in progress';
                  const isPassed = selectedTask.currentStepOrder > step.stepOrder || selectedTask.status === 'approved';
                  const stepApprovals = selectedTask.approvals?.filter((a) => a.stepOrder === step.stepOrder) || [];

                  return (
                    <div
                      key={step.stepOrder}
                      className={`p-4 rounded-xl border transition ${
                        isCurrent
                          ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : isPassed
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              isPassed
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-300 text-slate-700'
                            }`}
                          >
                            {step.stepOrder}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{step.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                            {step.logic} Approver Required
                          </span>
                        </div>

                        <div>
                          {isPassed ? (
                            <span className="text-xs font-bold text-emerald-600">Passed / Completed</span>
                          ) : isCurrent ? (
                            <span className="text-xs font-bold text-blue-600 animate-pulse">Awaiting Approval</span>
                          ) : (
                            <span className="text-xs text-slate-400">Upcoming Stage</span>
                          )}
                        </div>
                      </div>

                      {/* Approvers inside this stage grouped by Unit / Logic OR */}
                      <div className="mt-3 space-y-3 pt-2 border-t border-slate-200/60">
                        {(() => {
                          // Group approvals by unitId (or standalone if no unitId)
                          const groupedUnits: { [key: string]: { label: string; isMultiUser: boolean; approvals: any[] } } = {};

                          stepApprovals.forEach((app: any) => {
                            const groupKey = app.unitId || `single-${app.id}`;
                            const isMulti = stepApprovals.filter((a: any) => a.unitId && a.unitId === app.unitId).length > 1;
                            
                            if (!groupedUnits[groupKey]) {
                              groupedUnits[groupKey] = {
                                label: app.unitLabel || 'Approver',
                                isMultiUser: isMulti,
                                approvals: [],
                              };
                            }
                            groupedUnits[groupKey].approvals.push(app);
                          });

                          return Object.entries(groupedUnits).map(([key, group]) => {
                            if (group.isMultiUser) {
                              const approvedOne = group.approvals.find((a) => a.action === 'APPROVED' && !a.notes?.includes('Completed via approval'));
                              const isUnitSatisfied = group.approvals.some((a) => a.action === 'APPROVED');

                              return (
                                <div key={key} className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                        {group.label}
                                      </span>
                                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                                        Choice Group (Logic OR: 1 Approval Required)
                                      </span>
                                    </div>
                                    {isUnitSatisfied ? (
                                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Fulfilled {approvedOne ? `by ${approvedOne.assignedApprover?.username}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-medium text-amber-600">
                                        Waiting for 1 approver
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {group.approvals.map((app: any) => {
                                      const isActualApprover = app.action === 'APPROVED' && !app.notes?.includes('Completed via approval');
                                      const isCounterpartCompleted = app.action === 'APPROVED' && app.notes?.includes('Completed via approval');

                                      return (
                                        <div
                                          key={app.id}
                                          className={`p-2 rounded-md border text-xs flex items-center justify-between ${
                                            isActualApprover
                                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                              : isCounterpartCompleted
                                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                                              : 'bg-white border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <User className={`w-3.5 h-3.5 ${isActualApprover ? 'text-emerald-600' : 'text-slate-400'}`} />
                                            <span className="truncate">
                                              <strong className={isActualApprover ? 'text-emerald-900' : 'text-slate-700'}>
                                                {app.assignedApprover?.fullName || app.assignedApprover?.username}
                                              </strong>
                                              <span className="text-[10px] text-slate-400 ml-1">
                                                (@{app.assignedApprover?.username} • {app.assignedApprover?.role} • {app.assignedApprover?.division})
                                              </span>
                                            </span>
                                          </div>

                                          <div>
                                            {isActualApprover && (
                                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                                Approved
                                              </span>
                                            )}
                                            {isCounterpartCompleted && (
                                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium" title={app.notes}>
                                                Covered (OR)
                                              </span>
                                            )}
                                            {app.action === 'PENDING' && (
                                              <span className="text-[10px] text-amber-600 font-medium">
                                                Candidate
                                              </span>
                                            )}
                                            {app.action === 'REJECTED' && (
                                              <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">
                                                Rejected
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            // Single approver unit (Role+Division / Specific User)
                            const app = group.approvals[0];
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-slate-400" />
                                  <div>
                                    <span className="font-semibold text-slate-800">
                                      {app.assignedApprover?.fullName || app.assignedApprover?.username}
                                    </span>
                                    <span className="text-slate-400 ml-1.5">
                                      (@{app.assignedApprover?.username} • {app.assignedApprover?.role} • {app.assignedApprover?.division})
                                    </span>
                                    {app.unitLabel && (
                                      <span className="ml-2 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium text-[10px] border border-blue-100">
                                        {app.unitLabel}
                                      </span>
                                    )}
                                    {app.isDelegated && (
                                      <span className="ml-2 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                        Delegated
                                      </span>
                                    )}
                                    {app.isReassigned && (
                                      <span className="ml-2 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                        Reassigned
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {app.action === 'APPROVED' && (
                                    <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                    </span>
                                  )}
                                  {app.action === 'REJECTED' && (
                                    <span className="text-rose-600 font-bold flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" /> Rejected
                                    </span>
                                  )}
                                  {app.action === 'PENDING' && (
                                    <span className="text-amber-600 font-medium">Pending Decision</span>
                                  )}

                                  {/* Admin manual reassignment button */}
                                  {user?.role === 'Admin' && app.action === 'PENDING' && (
                                    <button
                                      onClick={() => handleOpenReassignModal(app.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                    >
                                      Reassign
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comprehensive Task Approval History Log */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Approval & Activity History Log
              </h3>

              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3 max-h-64 overflow-y-auto">
                {!selectedTask.histories || selectedTask.histories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    No historical logs recorded for this task yet.
                  </p>
                ) : (
                  selectedTask.histories.map((h: any, idx: number) => {
                    const actionStyles: Record<string, { badge: string; text: string }> = {
                      CREATED: { badge: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Task Created' },
                      APPROVED: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'Approved' },
                      REJECTED: { badge: 'bg-rose-100 text-rose-800 border-rose-200', text: 'Rejected' },
                      REVISION_REQUESTED: { badge: 'bg-purple-100 text-purple-800 border-purple-200', text: 'Revision Requested' },
                      REVISION_SUBMITTED: { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'Revision Submitted' },
                      DELEGATED: { badge: 'bg-amber-100 text-amber-800 border-amber-200', text: 'Delegated' },
                      REASSIGNED: { badge: 'bg-teal-100 text-teal-800 border-teal-200', text: 'Reassigned' },
                      CANCELED: { badge: 'bg-slate-200 text-slate-700 border-slate-300', text: 'Canceled' },
                    };

                    const style = actionStyles[h.action] || { badge: 'bg-slate-100 text-slate-700', text: h.action };

                    return (
                      <div
                        key={h.id || idx}
                        className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${style.badge}`}>
                              {style.text}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {h.actor ? `${h.actor.fullName || h.actor.username} (${h.actor.role})` : 'System'}
                            </span>
                            {h.targetUser && (
                              <span className="text-slate-500 flex items-center gap-1 font-medium">
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                {h.targetUser.fullName || h.targetUser.username} ({h.targetUser.role})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex-shrink-0">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {h.stepName && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            Stage: <span className="text-slate-700">{h.stepName}</span> (Stage #{h.stepOrder})
                          </div>
                        )}

                        {h.notes && (
                          <div className="p-2 bg-slate-50 rounded text-slate-700 border border-slate-100 italic">
                            &ldquo;{h.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
              {selectedTask.canApprove && (
                <button
                  onClick={() => handleOpenApproveModal(selectedTask)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Approve / Reject This Task
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Task */}
      {cancelModalOpen && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Cancel Task</h2>
            <p className="text-xs text-slate-500 mb-4">{selectedTask.title}</p>

            <form onSubmit={handleSubmitCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Provide reason for canceling this task..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Revision (Staff) */}
      {revisionModalOpen && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Submit Task Revision</h2>
            <p className="text-xs text-slate-500 mb-4">
              Perbarui data task sesuai catatan approver untuk melanjutkan proses approval.
            </p>

            {selectedTask.notes && (
              <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 text-xs rounded-xl mb-4">
                <strong>Approver Notes:</strong> {selectedTask.notes}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={revisionForm.title}
                  onChange={(e) => setRevisionForm({ ...revisionForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Updated Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={revisionForm.description}
                  onChange={(e) => setRevisionForm({ ...revisionForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Revision Notes (What was modified)
                </label>
                <input
                  type="text"
                  required
                  value={revisionForm.revisionNotes}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisionNotes: e.target.value })}
                  placeholder="e.g. Spesifikasi sudah disesuaikan dengan budget Q3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Submit Revision & Re-request Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Reassignment */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Admin Reassign Approver</h2>
            <p className="text-xs text-slate-500 mb-4">Manually assign task approval to a different user</p>

            <form onSubmit={handleSubmitReassign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  New Approver
                </label>
                <select
                  value={reassignUserId}
                  onChange={(e) => setReassignUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role} - {u.division})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Reassignment Reason
                </label>
                <input
                  type="text"
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="e.g. Approver on emergency leave"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  Save Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
