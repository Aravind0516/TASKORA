import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase/auth";
import { getAuthErrorMessage } from "@/lib/firebase/auth-errors";
import { createUserProfile } from "@/lib/services/user.service";

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<User> {
  let credentialUser: User;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    credentialUser = credential.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  await updateProfile(credentialUser, { displayName: name }).catch((error) => {
    console.error("Failed to set display name", error);
  });

  await createUserProfile(credentialUser.uid, { name, email }).catch((error) => {
    console.error("Failed to create user profile document", error);
  });

  return credentialUser;
}

/**
 * "Remember me" — controls whether the session survives closing the browser
 * (browserLocalPersistence, the default) or ends with the tab
 * (browserSessionPersistence). Must be set before signInWithEmailAndPassword.
 */
export async function setRememberMe(remember: boolean): Promise<void> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/user-not-found") {
      return;
    }
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function updateDisplayName(user: User, name: string): Promise<void> {
  try {
    await updateProfile(user, { displayName: name });
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
