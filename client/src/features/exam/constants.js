export const PALETTE_STATUS = {
  NOT_VISITED: 'not_visited',
  NOT_ANSWERED: 'not_answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  ANSWERED_MARKED: 'answered_marked',
};

// Display order of the legend and the submit summary.
export const PALETTE_STATUS_ORDER = [
  PALETTE_STATUS.ANSWERED,
  PALETTE_STATUS.NOT_ANSWERED,
  PALETTE_STATUS.NOT_VISITED,
  PALETTE_STATUS.MARKED,
  PALETTE_STATUS.ANSWERED_MARKED,
];

export const PALETTE_STATUS_LABEL = {
  [PALETTE_STATUS.NOT_VISITED]: 'Not visited',
  [PALETTE_STATUS.NOT_ANSWERED]: 'Not answered',
  [PALETTE_STATUS.ANSWERED]: 'Answered',
  [PALETTE_STATUS.MARKED]: 'Marked for review',
  [PALETTE_STATUS.ANSWERED_MARKED]: 'Answered and marked for review',
};
