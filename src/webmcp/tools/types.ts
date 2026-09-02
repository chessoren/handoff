export type ToolDef = WebMCP.ModelContextTool;

export type ToolName =
  | 'get_workspace_state'
  | 'get_column_schema'
  | 'read_rows'
  | 'focus_cells'
  | 'set_view'
  | 'propose_edits'
  | 'get_proposal_status'
  | 'annotate'
  | 'request_control'
  | 'hand_back';

export const FILTER_SCHEMA = {
  type: 'object',
  description: 'Keep only rows where a column matches.',
  properties: {
    columnId: { type: 'string', enum: ['source', 'received', 'text', 'area', 'severity', 'status', 'notes'] },
    op: { type: 'string', enum: ['equals', 'contains', 'isEmpty', 'oneOf'], description: '"isEmpty" needs no value. "oneOf" takes comma-separated values, e.g. "P0,P1".' },
    value: { type: 'string', description: 'Text to match. Case-insensitive.' },
  },
  required: ['columnId', 'op'],
} as const;
