export interface User {
  _id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_verified: boolean;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
  assigned_dashboards: string[];
}

export interface Field {
  name: string;
  type: string;
  unit?: string;
  last_value?: number;
  last_update?: string;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  field: string;
  config: Record<string, any>;
  created_at: string;
}

export interface Dashboard {
  _id: string;
  name: string;
  is_public: boolean;
  api_key: string;
  fields: Field[];
  widgets: Widget[];
  assigned_users: string[];
  created_at: string;
  updated_at: string;
}

export interface DashboardCreate {
  name: string;
  fields: Field[];
  widgets: Widget[];
  assigned_users: string[];
  is_public: boolean;
}

export interface DashboardUpdate {
  name?: string;
  fields?: Field[];
  widgets?: Widget[];
  assigned_users?: string[];
  is_public?: boolean;
} 