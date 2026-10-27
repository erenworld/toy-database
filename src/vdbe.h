#ifndef SQLITE_VDBE_H
#define SQLITE_VDBE_H

/*
** vdbe.c
*/
ExecuteResult sqlite3VdbeExec(Vdbe *p, sqlite3 *db);

/*
** vdbeaux.c
*/
void sqlite3VdbeSerialPut(Row *pSrc, void *pDest);
void sqlite3VdbeSerialGet(void *pSrc, Row *pDest);

#endif /* SQLITE_VDBE_H */
