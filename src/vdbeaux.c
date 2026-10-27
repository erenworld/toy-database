#include "sqliteInt.h"

void sqlite3VdbeSerialPut(Row *pSrc, void *pDest) {
  memcpy(pDest + ID_OFFSET, &(pSrc->id), ID_SIZE);
  memcpy(pDest + USERNAME_OFFSET, &(pSrc->username), USERNAME_SIZE);
  memcpy(pDest + EMAIL_OFFSET, &(pSrc->email), EMAIL_SIZE);
}

void sqlite3VdbeSerialGet(void *pSrc, Row *pDest) {
  memcpy(&(pDest->id), pSrc + ID_OFFSET, ID_SIZE);
  memcpy(&(pDest->username), pSrc + USERNAME_OFFSET, USERNAME_SIZE);
  memcpy(&(pDest->email), pSrc + EMAIL_OFFSET, EMAIL_SIZE);
}
