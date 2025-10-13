import { supabase } from './supabase';

export type Farm = {
  id: string;
  owner: string;
  name: string;
  location: string | null;
  total_area_ha: number | null;
  irrigation: string | null;
  created_at: string;
  updated_at: string;
};

export type Plot = {
  id: string;
  owner: string;
  farm_id: string;
  name: string;
  area_ha: number | null;
  crop: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFarmsWithPlots() {
  const { data, error } = await supabase
    .from('farms')
    .select(`*, plots:plots(*)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (Farm & { plots: Plot[] })[];
}

export async function upsertFarm(input: Partial<Farm>) {
  const { data, error } = await supabase.from('farms').upsert(input).select().single();
  if (error) throw error;
  return data as Farm;
}

export async function deleteFarm(id: string) {
  const { error } = await supabase.from('farms').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertPlot(input: Partial<Plot>) {
  const { data, error } = await supabase.from('plots').upsert(input).select().single();
  if (error) throw error;
  return data as Plot;
}

export async function deletePlot(id: string) {
  const { error } = await supabase.from('plots').delete().eq('id', id);
  if (error) throw error;
}
