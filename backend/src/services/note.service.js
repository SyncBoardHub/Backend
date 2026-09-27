'use strict';

const { supabase } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');
const activityService = require('./activity.service');

function mapNote(n) {
  return {
    id: n.id,
    teamId: n.team_id,
    title: n.title,
    content: n.content,
    authorId: n.author_id,
    updatedAt: n.updated_at
  };
}

async function getNotes(userId, teamId) {
  let query = supabase.from('notes').select('*');
  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', userId);
    const teamIds = (memberships || []).map(m => m.team_id);
    if (!teamIds.length) return [];
    query = query.in('team_id', teamIds);
  }
  const { data: notes } = await query;
  return (notes || []).map(mapNote);
}

async function createNote(actor, { teamId, title, content }, io) {
  const cleanTitle = sanitize(title);
  if (!cleanTitle) throw Object.assign(new Error('Note title is required'), { status: 400 });

  const { data: note, error } = await supabase.from('notes')
    .insert({ title: cleanTitle, content: sanitize(content), team_id: teamId, author_id: actor.id })
    .select().single();
  if (error) throw Object.assign(new Error('Failed to create note'), { status: 500 });

  const result = mapNote(note);
  io.to(teamId).emit('note:created', result);
  void activityService.recordActivity({ teamId, actor, entityType: 'note', entityId: note.id, action: 'created', metadata: { title: note.title }, io });
  return result;
}

async function updateNote(actor, noteId, body, io) {
  const { data: existingNote } = await supabase.from('notes').select('team_id').eq('id', noteId).single();
  if (!existingNote) throw Object.assign(new Error('Not found'), { status: 404 });

  const updates = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;

  const { data: note, error } = await supabase.from('notes').update(updates).eq('id', noteId).select().single();
  if (error || !note) throw Object.assign(new Error('Not found'), { status: 404 });

  const result = mapNote(note);
  io.to(note.team_id).emit('note:updated', result);
  void activityService.recordActivity({ teamId: note.team_id, actor, entityType: 'note', entityId: note.id, action: 'updated', metadata: { title: note.title }, io });
  return result;
}

async function deleteNote(actor, noteId, io) {
  const { data: note } = await supabase.from('notes').select('team_id, title').eq('id', noteId).single();
  if (!note) throw Object.assign(new Error('Not found'), { status: 404 });

  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw Object.assign(new Error('Failed to delete note'), { status: 500 });

  io.to(note.team_id).emit('note:deleted', noteId);
  void activityService.recordActivity({ teamId: note.team_id, actor, entityType: 'note', entityId: noteId, action: 'deleted', metadata: { title: note.title }, io });
  return { success: true };
}

// ─── Diagrams ────────────────────────────────────────────────────────────────
function mapDiagram(d) {
  return {
    id: d.id,
    teamId: d.team_id,
    title: d.title,
    diagramData: d.diagram_data,
    createdBy: d.created_by,
    createdAt: d.created_at
  };
}

async function getDiagrams(teamId) {
  const { data: diagrams } = await supabase.from('diagrams').select('*').eq('team_id', teamId);
  return (diagrams || []).map(mapDiagram);
}

async function saveDiagram(actorId, { teamId, title, diagramData }, io) {
  if (!teamId || !title) throw Object.assign(new Error('Missing fields'), { status: 400 });

  const { data: existing } = await supabase.from('diagrams').select('id').eq('title', title).eq('team_id', teamId).single();

  let diagram;
  if (existing) {
    const { data: updated, error } = await supabase.from('diagrams').update({ diagram_data: diagramData }).eq('id', existing.id).select().single();
    if (error) throw Object.assign(new Error('Failed to update diagram'), { status: 500 });
    diagram = updated;
  } else {
    const { data: inserted, error } = await supabase.from('diagrams')
      .insert({ team_id: teamId, title, diagram_data: diagramData, created_by: actorId })
      .select().single();
    if (error) throw Object.assign(new Error('Failed to save diagram'), { status: 500 });
    diagram = inserted;
  }

  const result = mapDiagram(diagram);
  io.to(teamId).emit('diagram:saved', result);
  return result;
}

async function deleteDiagram(diagramId, io) {
  const { data: diagram } = await supabase.from('diagrams').select('team_id').eq('id', diagramId).single();
  if (!diagram) throw Object.assign(new Error('Not found'), { status: 404 });

  const { error } = await supabase.from('diagrams').delete().eq('id', diagramId);
  if (error) throw Object.assign(new Error('Failed to delete diagram'), { status: 500 });
  io.to(diagram.team_id).emit('diagram:deleted', diagramId);
  return { success: true };
}

module.exports = { mapNote, getNotes, createNote, updateNote, deleteNote, mapDiagram, getDiagrams, saveDiagram, deleteDiagram };
