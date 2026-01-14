/**
 * BankService.js
 * Firebase logic for soundbank and sample management.
 * Handles Firestore documents (metadata) and Firebase Storage (audio files).
 */
import { db, storage, auth } from "../firebase";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

class BankService {
  constructor() {
    // Local memory to keep track of banks without constant DB polling
    this.localCache = {};
  }

  /**
   * Fetches all soundBanks from Firestore and fills the local cache.
   */
  async loadAll() {
    try {
      const snapshot = await getDocs(collection(db, "soundBanks"));
      this.localCache = {};
      snapshot.forEach((doc) => {
        // syncing firestore data to cache
        this.localCache[doc.id] = doc.data().samples || [];
      });
      return this.localCache;
    } catch (e) {
      console.warn("BankService: Offline mode or Error", e);
      return {};
    }
  }

  /**
   * Creates a new soundBank document in Firestore.
   */
  async createBank(name) {
    if (this.localCache[name]) return false;
    this.localCache[name] = [];

    try {
      await setDoc(doc(db, "soundBanks", name), {
        createdAt: new Date(),
        owner: auth.currentUser ? auth.currentUser.uid : "anon",
        samples: []
      });
      return true;
    } catch (e) {
      console.error("BankService: Create failed", e);
      delete this.localCache[name]; // rollback cache
      return false;
    }
  }

  /**
   * Deletes a bank and all its associated audio files in Storage.
   * Uses parallel deletion for better performance.
   */
  async deleteBank(bankName) {
    if (!auth.currentUser) throw new Error("User not logged in");

    const bankSamples = this.localCache[bankName] || [];

    try {
      // creating an array of deletion promises for Storage
      const deletePromises = bankSamples.map(sample => {
        let fileRef;

        // trying to get path from fullPath metadata first
        if (sample.fullPath) {
          fileRef = ref(storage, sample.fullPath);
        }
        // fallback: parsing path from the download URL
        else if (sample.url) {
          try {
            const pathStart = sample.url.indexOf('/o/') + 3;
            const pathEnd = sample.url.indexOf('?');
            const rawPath = pathEnd > -1 ? sample.url.substring(pathStart, pathEnd) : sample.url.substring(pathStart);
            const decodedPath = decodeURIComponent(rawPath);

            fileRef = ref(storage, decodedPath);
          } catch (err) {
            console.warn("Impossibile estrarre path dall'URL:", sample.name);
            return Promise.resolve();
          }
        }

        if (fileRef) {
          // deleting file and suppressing individual errors
          return deleteObject(fileRef).catch(e => {
            console.warn(`File ${sample.name} già rimosso o non trovato`, e);
          });
        }
        return Promise.resolve();
      });

      // waiting for all storage files to be deleted
      await Promise.all(deletePromises);

      // deleting the firestore document
      await deleteDoc(doc(db, "soundBanks", bankName));

      // clearing local memory
      delete this.localCache[bankName];

      return true;
    } catch (e) {
      console.error("BankService: Delete bank failed", e);
      return false;
    }
  }

  /**
   * Uploads a WAV blob to Storage and saves metadata to Firestore.
   */
  async addSample(bankName, sampleName, blob, color) {
    if (!auth.currentUser) throw new Error("User not logged in");

    // generating unique storage path
    const storageRef = ref(storage, `users/${auth.currentUser.uid}/${bankName}/${sampleName}_${Date.now()}.wav`);
    const snapshot = await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(snapshot.ref);

    // building sample object with extra metadata for easier management
    const newSample = {
      name: sampleName,
      url,
      color,
      fullPath: snapshot.ref.fullPath
    };

    // adding entry to firestore array
    await updateDoc(doc(db, "soundBanks", bankName), {
      samples: arrayUnion(newSample)
    });

    // updating local cache for immediate UI feedback
    if (this.localCache[bankName]) this.localCache[bankName].push(newSample);

    return newSample;
  }

  /**
   * Deletes a single sample from DB and Storage.
   */
  async deleteSample(bankName, sampleObject) {
    // removing from database list
    await updateDoc(doc(db, "soundBanks", bankName), {
      samples: arrayRemove(sampleObject)
    });

    // removing from binary storage
    try {
      const deleteRef = sampleObject.fullPath ? ref(storage, sampleObject.fullPath) : ref(storage, sampleObject.url);
      await deleteObject(deleteRef);
    } catch (e) {
      console.warn("File already gone from storage?", e);
    }

    // syncing local cache
    if (this.localCache[bankName]) {
      this.localCache[bankName] = this.localCache[bankName].filter(s => s.name !== sampleObject.name);
    }
  }
}

// exporting as singleton
export const bankService = new BankService();