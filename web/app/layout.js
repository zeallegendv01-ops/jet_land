import './globals.css';
import WhatsAppBubble from './components/WhatsAppBubble';

export const metadata = {
  title: 'JETLANDS',
  description: 'Curated land sopportunities for the future you are building.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<WhatsAppBubble/></body></html>;
}
