export interface User {
  _id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_verified: boolean;
  is_approved: boolean;
}

export interface Field {
  name: string;
  type: string;
  unit?: string;
  value?: number;
}

export interface WidgetConfig {
  title: string;
  field: string;
  chartType?: string;
  timeRange?: string;
  aggregationInterval?: string;
  unit?: string;
}

export interface Widget {
  type: string;
  config: WidgetConfig;
}

export interface Dashboard {
  _id: string;
  name: string;
  description: string;
  is_public: boolean;
  fields: Field[];
  widgets: Widget[];
  assigned_users: string[];
  created_by: string;
  api_key: string;
  created_at: string;
  updated_at: string;
} 