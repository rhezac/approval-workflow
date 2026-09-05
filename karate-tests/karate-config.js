function fn() {
  var env = karate.env; // get system property 'karate.env'
  karate.log('karate.env system property was:', env);
  
  if (!env) {
    env = 'dev';
  }
  
  var config = {
    baseUrl: 'http://localhost:3000/api',
    apiKey: 'ak_live_enterprise_flow_7829104812',
    credentials: {
      admin: { username: 'admin', password: 'Admin@123' },
      director: { username: 'direktur', password: 'Admin@123' },
      managerIt: { username: 'manager_it', password: 'Admin@123' },
      managerFin: { username: 'manager_fin', password: 'Admin@123' },
      managerBiz: { username: 'manager_biz', password: 'Admin@123' },
      staffIt: { username: 'staff_it', password: 'Admin@123' },
      staffFin: { username: 'staff_fin', password: 'Admin@123' },
      staffBiz: { username: 'staff_biz', password: 'Admin@123' }
    }
  };

  karate.configure('connectTimeout', 10000);
  karate.configure('readTimeout', 10000);
  return config;
}
