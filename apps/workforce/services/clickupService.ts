import { supabase } from '@/services/supabaseClient';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clickup-sync`;

export interface ClickUpConfig {
  id?: string;
  api_token: string;
  team_id: string;
  team_name: string;
  spaces: ClickUpSpace[];
  last_synced: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  lists: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  folder: string | null;
  selected: boolean;
}

export interface SyncedTask {
  clickup_task_id: string;
  title: string;
  clickup_status: string;
  clickup_list_id: string;
  list_name: string;
  assignee_emails: string[];
  date_done: string | null;
  date_created: string | null;
  date_updated: string | null;
}

// ── Edge Function proxy calls ─────────────────────────────────
async function callEdgeFunction(body: any): Promise<any> {
  const resp = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function fetchTeams(token: string) {
  return callEdgeFunction({ action: 'get_teams', token });
}

export async function fetchSpaces(token: string, teamId: string) {
  return callEdgeFunction({ action: 'get_spaces', token, teamId });
}

export async function fetchLists(token: string, spaceId: string) {
  return callEdgeFunction({ action: 'get_lists', token, spaceId });
}

export async function syncTasks(token: string, teamId: string, listIds: string[]): Promise<{ tasks: SyncedTask[]; member_count: number }> {
  return callEdgeFunction({ action: 'sync_tasks', token, teamId, listIds });
}

// ── Config CRUD ───────────────────────────────────────────────
export async function loadConfig(): Promise<ClickUpConfig | null> {
  const { data, error } = await supabase
    .from('wf_clickup_config')
    .select('*')
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

export async function saveConfig(config: Omit<ClickUpConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ClickUpConfig> {
  // Upsert: delete existing + insert new
  await supabase.from('wf_clickup_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data, error } = await supabase
    .from('wf_clickup_config')
    .insert({ ...config, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConfigSyncTime(): Promise<void> {
  const { error } = await supabase
    .from('wf_clickup_config')
    .update({ last_synced: new Date().toISOString(), updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
