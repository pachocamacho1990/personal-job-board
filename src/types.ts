export interface User {
  id: number;
  email: string;
  created_at?: string;
  last_login?: string;
}

export interface Board {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: number;
  user_id: number;
  board_id: number;
  type: 'job' | 'connection';
  rating: number | null;
  status: 'interested' | 'applied' | 'forgotten' | 'interview' | 'pending' | 'offer' | 'rejected' | 'archived';
  origin: string;
  is_unseen: boolean;
  is_locked: boolean;
  company: string;
  position: string;
  location: string;
  salary: string;
  contact_name: string | null;
  organization: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessEntity {
  id: number;
  user_id: number;
  name: string;
  type: 'investor' | 'vc' | 'accelerator' | 'connection';
  status: 'researching' | 'contacted' | 'meeting' | 'negotiation' | 'signed' | 'rejected' | 'passed';
  contact_person: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobHistory {
  id: number;
  job_id: number;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
}

export interface FileAttachment {
  id: number;
  job_id?: number;
  entity_id?: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  created_at: string;
}
