import { initializeApp } from "firebase/app";
import { getFirestore, doc as firestoreDoc, setDoc as firestoreSetDoc, deleteDoc as firestoreDeleteDoc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase JS Client SDK
const app = initializeApp(firebaseConfig);

// Export the firestore database instance securely with its databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Compatibility helper to represent a Firestore Document Reference in the server-side environment
export function doc(firestoreInstance: typeof db, collectionPath: string, documentId: string) {
  return firestoreDoc(firestoreInstance, collectionPath, documentId);
}

// Compatibility helper to perform set doc operations via Client SDK
export async function setDoc(docRef: any, data: any) {
  try {
    await firestoreSetDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path || "unknown");
  }
}

// Compatibility helper to perform delete doc operations via Client SDK
export async function deleteDoc(docRef: any) {
  try {
    await firestoreDeleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docRef.path || "unknown");
  }
}
