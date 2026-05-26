declare module 'better-sqlite3-session-store' {
  import session from 'express-session';
  import Database from 'better-sqlite3';
  function SqliteStore(session: any): new (options: { client: Database.Database }) => session.Store;
  export = SqliteStore;
}
