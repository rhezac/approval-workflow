import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { GitFork, Plus, Edit2, Trash2, AlertCircle, Search, X, User } from 'lucide-react';

export type ApproverUnitType = 'ROLE_DIVISION' | 'SPECIFIC_USER' | 'MULTI_USER_OPTION';

export interface ApproverUnit {
  id: string;
  type: ApproverUnitType;
  label?: string;
  roleRequired?: string;
  divisionRequired?: string;
  userId?: string;
  userIds?: string[];
}

export interface StepConfig {
  stepOrder: number;
  name: string;
  approverUnits: ApproverUnit[];
  logic?: 'ANY' | 'ALL';
  roleRequired?: string;
  divisionRequired?: string;
  approverUserIds?: string[];
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  version: number;
  isActive: boolean;
  steps: StepConfig[];
  createdAt: string;
}

interface UserOption {
  id: string;
  username: string;
  fullName?: string;
  role: string;
  division: string;
}

// Single User Autocomplete Component for Specific User
const SingleUserAutocomplete: React.FC<{
  selectedUserId?: string;
  onChange: (id: string) => void;
  availableUsers: UserOption[];
}> = ({ selectedUserId, onChange, availableUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get('/users', {
          params: { search: searchTerm.trim(), limit: 15 },
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectUser = (user: UserOption) => {
    onChange(user.id);
    setSearchTerm('');
    setDropdownOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="pt-1 space-y-1.5" ref={wrapperRef}>
      <label className="block text-[11px] font-medium text-slate-600">
        Select Specific User:
      </label>

      {selectedUserId ? (
        <div className="flex items-center justify-between p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <div>
              <span className="font-bold text-blue-950 block">
                {selectedUser?.fullName || selectedUser?.username || selectedUserId}
              </span>
              {selectedUser?.fullName && (
                <span className="text-[10px] text-blue-700/70 font-mono">@{selectedUser.username}</span>
              )}
            </div>
            {selectedUser && (
              <span className="text-[10px] text-blue-700/70">
                ({selectedUser.role} • {selectedUser.division})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-0.5 rounded hover:bg-rose-50 transition"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchTerm.trim()) setDropdownOpen(true);
              }}
              placeholder="Search specific user by full name or username..."
              className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {dropdownOpen && searchTerm.trim().length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-2.5 text-center text-xs text-slate-400">Searching approvers...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-2.5 text-center text-xs text-slate-400">No users found for "{searchTerm}"</div>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <div>
                        <span className="font-semibold">{u.fullName || u.username}</span>
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          (@{u.username} • {u.role} • {u.division})
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold">Select</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Autocomplete User Search Component for Multi-User Choice & Specific User
const MultiUserAutocomplete: React.FC<{
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  availableUsers: UserOption[];
}> = ({ selectedUserIds, onChange, availableUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced user search to backend with limit to keep UI lightweight even for 1000+ users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get('/users', {
          params: { search: searchTerm.trim(), limit: 15 },
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddUser = (user: UserOption) => {
    if (!selectedUserIds.includes(user.id)) {
      onChange([...selectedUserIds, user.id]);
    }
    setSearchTerm('');
    setDropdownOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  return (
    <div className="pt-1 space-y-2" ref={wrapperRef}>
      <label className="block text-[11px] font-medium text-slate-600">
        Candidate Approvers ({selectedUserIds.length} Selected) — <em>Cari & Tambahkan Approver (Logic OR)</em>:
      </label>

      {/* Selected Users Chips */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-28 overflow-y-auto">
          {selectedUserIds.map((id) => {
            const user = availableUsers.find((u) => u.id === id) || { username: id, fullName: id, role: 'User', division: '' };
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-md text-xs font-medium shadow-2xs"
              >
                <User className="w-3 h-3 text-emerald-600" />
                <span>
                  <strong>{user.fullName || user.username}</strong> <span className="text-[10px] text-emerald-700/70 font-normal">(@{user.username} • {user.role}{user.division ? ` - ${user.division}` : ''})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(id)}
                  className="p-0.5 hover:bg-emerald-200/60 rounded text-emerald-700 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setDropdownOpen(true);
            }}
            placeholder="Search by full name or username to add approver..."
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="absolute right-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown List */}
        {dropdownOpen && searchTerm.trim().length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
            {isSearching ? (
              <div className="p-2.5 text-center text-xs text-slate-400">Searching approvers...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-slate-400">No matching users found for "{searchTerm}"</div>
            ) : (
              searchResults.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleAddUser(u)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'hover:bg-blue-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-300' : 'text-blue-600'}`} />
                      <div>
                        <span className="font-semibold">{u.fullName || u.username}</span>
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          (@{u.username} • {u.role} • {u.division})
                        </span>
                      </div>
                    </div>
                    <div>
                      {isSelected ? (
                        <span className="text-[10px] text-slate-400 font-medium">Added</span>
                      ) : (
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWf, setEditingWf] = useState<WorkflowItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [] as StepConfig[],
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workflows');
      setWorkflows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      setAvailableUsers(res.data);
    } catch (err) {
      try {
        const res2 = await api.get('/tasks/delegates/candidates');
        setAvailableUsers(res2.data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [combobox, setCombobox] = useState<{ divisions: any[]; roles: any[] }>({
    divisions: [],
    roles: [],
  });

  const fetchCombobox = async () => {
    try {
      const res = await api.get('/combobox');
      setCombobox(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchUsers();
    fetchCombobox();
  }, []);

  const createDefaultSteps = (): StepConfig[] => [
    {
      stepOrder: 1,
      name: 'Level 1: Leads & Multi Reviewers',
      approverUnits: [
        {
          id: 'u-1-1',
          type: 'ROLE_DIVISION',
          label: 'Manager IT',
          roleRequired: 'Manager',
          divisionRequired: 'IT',
        },
        {
          id: 'u-1-2',
          type: 'ROLE_DIVISION',
          label: 'Manager Finance',
          roleRequired: 'Manager',
          divisionRequired: 'Finance',
        },
        {
          id: 'u-1-3',
          type: 'SPECIFIC_USER',
          label: 'Specific Staff Finance',
          userId: '',
        },
        {
          id: 'u-1-4',
          type: 'MULTI_USER_OPTION',
          label: 'Option: Business Team (Cukup salah 1)',
          userIds: [],
        },
      ],
    },
    {
      stepOrder: 2,
      name: 'Level 2: Direktur Final Approval',
      approverUnits: [
        {
          id: 'u-2-1',
          type: 'ROLE_DIVISION',
          label: 'Direktur Approval',
          roleRequired: 'Direktur',
          divisionRequired: 'ANY',
        },
      ],
    },
  ];

  const handleOpenCreate = () => {
    setEditingWf(null);
    setFormData({
      name: '',
      description: '',
      steps: createDefaultSteps(),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (wf: WorkflowItem) => {
    setEditingWf(wf);

    // Normalize legacy steps into approverUnits
    const normalizedSteps: StepConfig[] = (wf.steps || []).map((step, sIdx) => {
      let units: ApproverUnit[] = [];

      if (step.approverUnits && step.approverUnits.length > 0) {
        units = step.approverUnits.map((u, uIdx) => ({
          id: u.id || `u-${step.stepOrder || sIdx + 1}-${uIdx + 1}`,
          type: u.type || 'ROLE_DIVISION',
          label: u.label || '',
          roleRequired: u.roleRequired || 'Manager',
          divisionRequired: u.divisionRequired || 'SAME_AS_REQUESTER',
          userId: u.userId || '',
          userIds: u.userIds || [],
        }));
      } else {
        // Migrate legacy step
        units = [
          {
            id: `u-${step.stepOrder || sIdx + 1}-1`,
            type: step.approverUserIds && step.approverUserIds.length > 1 ? 'MULTI_USER_OPTION' : (step.approverUserIds && step.approverUserIds.length === 1 ? 'SPECIFIC_USER' : 'ROLE_DIVISION'),
            label: step.name,
            roleRequired: step.roleRequired || 'Manager',
            divisionRequired: step.divisionRequired || 'SAME_AS_REQUESTER',
            userId: step.approverUserIds?.[0] || '',
            userIds: step.approverUserIds || [],
          },
        ];
      }

      return {
        stepOrder: step.stepOrder || sIdx + 1,
        name: step.name || `Level ${sIdx + 1}`,
        approverUnits: units,
        logic: step.logic || 'ALL',
      };
    });

    setFormData({
      name: wf.name,
      description: wf.description || '',
      steps: normalizedSteps,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleAddStep = () => {
    const nextOrder = formData.steps.length + 1;
    const newStep: StepConfig = {
      stepOrder: nextOrder,
      name: `Level ${nextOrder}: Approval Stage`,
      approverUnits: [
        {
          id: `u-${nextOrder}-1`,
          type: 'ROLE_DIVISION',
          label: 'Manager Approval',
          roleRequired: 'Manager',
          divisionRequired: 'SAME_AS_REQUESTER',
        },
      ],
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const handleRemoveStep = (stepIndex: number) => {
    const updated = formData.steps.filter((_, idx) => idx !== stepIndex);
    const reindexed = updated.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setFormData({ ...formData, steps: reindexed });
  };

  const handleStepNameChange = (stepIndex: number, name: string) => {
    const updated = [...formData.steps];
    updated[stepIndex].name = name;
    setFormData({ ...formData, steps: updated });
  };

  const handleAddUnitToStep = (stepIndex: number) => {
    const step = formData.steps[stepIndex];
    const nextUnitNum = step.approverUnits.length + 1;
    const newUnit: ApproverUnit = {
      id: `u-${step.stepOrder}-${Date.now()}`,
      type: 'ROLE_DIVISION',
      label: `Required Approver #${nextUnitNum}`,
      roleRequired: 'Manager',
      divisionRequired: 'IT',
    };
    const updated = [...formData.steps];
    updated[stepIndex].approverUnits.push(newUnit);
    setFormData({ ...formData, steps: updated });
  };

  const handleRemoveUnitFromStep = (stepIndex: number, unitIndex: number) => {
    const updated = [...formData.steps];
    updated[stepIndex].approverUnits.splice(unitIndex, 1);
    setFormData({ ...formData, steps: updated });
  };

  const handleUnitChange = (stepIndex: number, unitIndex: number, field: keyof ApproverUnit, value: any) => {
    const updated = [...formData.steps];
    const unit = { ...updated[stepIndex].approverUnits[unitIndex], [field]: value };
    updated[stepIndex].approverUnits[unitIndex] = unit;
    setFormData({ ...formData, steps: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.steps.length === 0) {
      setFormError('Workflow must have at least 1 approval level.');
      return;
    }

    // Deep validation
    for (const step of formData.steps) {
      if (!step.approverUnits || step.approverUnits.length === 0) {
        setFormError(`Level ${step.stepOrder} (${step.name}) must have at least 1 approval unit.`);
        return;
      }

      for (let i = 0; i < step.approverUnits.length; i++) {
        const u = step.approverUnits[i];
        if (u.type === 'SPECIFIC_USER' && (!u.userId || u.userId.trim() === '')) {
          setFormError(`Level ${step.stepOrder} > Approver #${i + 1}: Please select a specific user.`);
          return;
        }
        if (u.type === 'MULTI_USER_OPTION' && (!u.userIds || u.userIds.length < 2)) {
          setFormError(`Level ${step.stepOrder} > Approver #${i + 1}: Please select at least 2 users for the Multi-User Option.`);
          return;
        }
      }
    }

    try {
      if (editingWf) {
        await api.put(`/workflows/${editingWf.id}`, formData);
      } else {
        await api.post('/workflows', formData);
      }
      setModalOpen(false);
      fetchWorkflows();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save workflow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this workflow?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      fetchWorkflows();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate workflow');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GitFork className="w-7 h-7 text-blue-600" />
            Approval Workflow Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure multi-level sequential workflows (Level 1, Level 2, Level 3...) with <strong>multiple required approvers per level</strong>.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Multi-Level Workflow</span>
        </button>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            No approval workflows found. Create one to get started.
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                    Version v{wf.version}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(wf)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition"
                      title="Edit Workflow"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition"
                      title="Deactivate Workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-1">{wf.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {wf.description || 'No description provided.'}
                </p>

                {/* Steps Visual List */}
                <div className="space-y-3 mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Approval Stages ({wf.steps?.length || 0} Levels)</span>
                  </div>

                  {wf.steps?.map((step, idx) => {
                    const unitsCount = step.approverUnits?.length || 1;

                    return (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                              {step.stepOrder}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">{step.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {unitsCount} Required Approval{unitsCount > 1 ? 's (ALL)' : ''}
                          </span>
                        </div>

                        {/* Approvers inside this level */}
                        <div className="space-y-1.5 pl-6 border-l-2 border-slate-100 ml-2">
                          {step.approverUnits && step.approverUnits.length > 0 ? (
                            step.approverUnits.map((u, uIdx) => (
                              <div key={uIdx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <span className="font-medium text-slate-700">
                                  {u.type === 'ROLE_DIVISION' && (
                                    <>Role {u.roleRequired} ({u.divisionRequired === 'SAME_AS_REQUESTER' ? 'Same Division' : u.divisionRequired})</>
                                  )}
                                  {u.type === 'SPECIFIC_USER' && (
                                    <>Direct User: <span className="text-blue-700 font-semibold">{availableUsers.find(au => au.id === u.userId)?.fullName || availableUsers.find(au => au.id === u.userId)?.username || 'Selected User'}</span></>
                                  )}
                                  {u.type === 'MULTI_USER_OPTION' && (
                                    <>Choice (Logic OR): <span className="text-emerald-700 font-semibold">{u.userIds?.map(id => {
                                      const uObj = availableUsers.find(au => au.id === id);
                                      return uObj?.fullName || uObj?.username;
                                    }).filter(Boolean).join(' / ') || `${u.userIds?.length || 0} People`}</span></>
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-600">
                              {step.roleRequired} • {step.divisionRequired || 'Division'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Created {new Date(wf.createdAt).toLocaleDateString()}</span>
                <span className={wf.isActive ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                  {wf.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create / Edit Workflow */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              {editingWf ? 'Edit Approval Workflow' : 'Configure Multi-Level & Multi-Approver Workflow'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Set up sequential stages (Level 1, Level 2, Level 3...). In each level, you can add <strong>multiple required approvers</strong> (Role+Division, Specific User, or Multi-User Choice).
            </p>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Feature Implementation Multi-Level Approval"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Level 1: Lead Eng, Lead Fin, Staff Fin & Biz Option"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Levels & Multi-Approver Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Sequential Approval Levels
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Level 1 must be 100% satisfied before Level 2 starts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Next Level</span>
                  </button>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                  {formData.steps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs"
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {step.stepOrder}
                          </span>
                          <input
                            type="text"
                            required
                            value={step.name}
                            onChange={(e) => handleStepNameChange(sIdx, e.target.value)}
                            placeholder={`Level ${step.stepOrder} Name`}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-72"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddUnitToStep(sIdx)}
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Required Approver</span>
                          </button>

                          {formData.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(sIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                              title="Remove Level"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Approver Units inside this Level */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>
                            Required Approver List in Level {step.stepOrder} ({step.approverUnits.length} Approvers Required - ALL / AND Logic):
                          </span>
                        </div>

                        {step.approverUnits.map((unit, uIdx) => (
                          <div
                            key={unit.id || uIdx}
                            className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                                  {uIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-700">
                                  Approver #{uIdx + 1}
                                </span>
                              </div>

                              {step.approverUnits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUnitFromStep(sIdx, uIdx)}
                                  className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                                >
                                  ✕ Remove Approver
                                </button>
                              )}
                            </div>

                            {/* Unit Type Radio Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <label
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                  unit.type === 'ROLE_DIVISION'
                                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`unit_type_${sIdx}_${uIdx}`}
                                  checked={unit.type === 'ROLE_DIVISION'}
                                  onChange={() => handleUnitChange(sIdx, uIdx, 'type', 'ROLE_DIVISION')}
                                  className="text-blue-600"
                                />
                                <span>1. Role + Division</span>
                              </label>

                              <label
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                  unit.type === 'SPECIFIC_USER'
                                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`unit_type_${sIdx}_${uIdx}`}
                                  checked={unit.type === 'SPECIFIC_USER'}
                                  onChange={() => handleUnitChange(sIdx, uIdx, 'type', 'SPECIFIC_USER')}
                                  className="text-blue-600"
                                />
                                <span>2. Specific Username</span>
                              </label>

                              <label
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                  unit.type === 'MULTI_USER_OPTION'
                                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`unit_type_${sIdx}_${uIdx}`}
                                  checked={unit.type === 'MULTI_USER_OPTION'}
                                  onChange={() => handleUnitChange(sIdx, uIdx, 'type', 'MULTI_USER_OPTION')}
                                  className="text-blue-600"
                                />
                                <span>3. Multi-User Choice (Logic OR)</span>
                              </label>
                            </div>

                            {/* Configuration for Unit Type */}
                            {unit.type === 'ROLE_DIVISION' && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                    Required Role
                                  </label>
                                  <select
                                    value={unit.roleRequired || 'Manager'}
                                    onChange={(e) => handleUnitChange(sIdx, uIdx, 'roleRequired', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                                  >
                                    {combobox.roles?.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                    Required Division
                                  </label>
                                  <select
                                    value={unit.divisionRequired || 'IT'}
                                    onChange={(e) => handleUnitChange(sIdx, uIdx, 'divisionRequired', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                                  >
                                    {combobox.divisions?.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name}
                                      </option>
                                    ))}
                                    <option value="SAME_AS_REQUESTER">Same Division as Requester</option>
                                    <option value="ANY">Any Division</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {unit.type === 'SPECIFIC_USER' && (
                              <SingleUserAutocomplete
                                selectedUserId={unit.userId}
                                onChange={(newId) => handleUnitChange(sIdx, uIdx, 'userId', newId)}
                                availableUsers={availableUsers}
                              />
                            )}

                            {unit.type === 'MULTI_USER_OPTION' && (
                              <MultiUserAutocomplete
                                selectedUserIds={unit.userIds || []}
                                onChange={(newIds) => handleUnitChange(sIdx, uIdx, 'userIds', newIds)}
                                availableUsers={availableUsers}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  {editingWf ? 'Save Changes' : 'Save Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPage;
