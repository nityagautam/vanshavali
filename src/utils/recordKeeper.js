// Reserved tag marking the members who preserved and carried this Vanshavali
// forward (PRD 007). Set it through Edit Member (Tags field) or the DB script.
export const RECORD_KEEPER_TAG = 'record-keeper';

export const isRecordKeeper = person => !!person?.tags?.includes(RECORD_KEEPER_TAG);

// Tags that drive the UI and are not shown as plain chips.
export const HIDDEN_TAGS = new Set(['root', 'placeholder', RECORD_KEEPER_TAG]);
