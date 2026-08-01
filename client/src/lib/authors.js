// A log or comment whose author was permanently deleted keeps the row and
// loses the name: the server nulls both the id and the denormalized name, so
// nothing of the person survives the delete. The entry is still real session
// history, so it needs something to sign it.
//
// One place for the wording, because it appears on the ninja profile, the club
// threads and the belt-advancement report, and those must not drift apart.
export const DELETED_AUTHOR = 'Deleted user';

export const authorName = (name) => name || DELETED_AUTHOR;
