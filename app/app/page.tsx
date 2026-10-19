import type { Metadata } from 'next';
import { Dashboard } from '../../components/dashboard';
export const metadata: Metadata = { title: 'Dashboard — Tallyroom' };
export default function Page() { return <Dashboard />; }
