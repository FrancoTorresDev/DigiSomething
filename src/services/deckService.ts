import { db } from './firebase'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import type { Deck } from '@/models/Deck'

const COL = 'decks'

export async function getUserDecks(uid: string): Promise<Deck[]> {
  const q = query(collection(db, COL), where('ownerId', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck)
}

export async function saveDeck(deck: Omit<Deck, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...deck,
    createdAt: serverTimestamp()
  })
  return ref.id
}

export async function updateDeck(id: string, data: Partial<Deck>): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>)
}

export async function deleteDeck(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function getTopDecks(limitCount = 20): Promise<Deck[]> {
  const q = query(
    collection(db, COL),
    where('isPublic', '==', true),
    orderBy('votes', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck)
}
