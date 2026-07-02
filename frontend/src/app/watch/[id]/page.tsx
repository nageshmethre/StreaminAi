import WatchClient from './watch-client';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' }
  ];
}

export default async function WatchServerPage() {
  return <WatchClient />;
}
