import LiveClient from './live-client';

export async function generateStaticParams() {
  return [
    { id: '1' }
  ];
}

export default async function LiveServerPage() {
  return <LiveClient />;
}
