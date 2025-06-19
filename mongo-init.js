// MongoDB initialization script
db = db.getSiblingDB('thingspeak_clone');

// Create application user
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'thingspeak_clone'
    }
  ]
});

// Create collections with indexes
db.createCollection('users');
db.createCollection('dashboards');
db.createCollection('data');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.dashboards.createIndex({ "api_key": 1 }, { unique: true });
db.data.createIndex({ "dashboard_id": 1, "timestamp": -1 });
db.data.createIndex({ "timestamp": -1 });

print('MongoDB initialization completed'); 