import type {Metadata,Viewport} from 'next';
import './globals.css';

export const metadata:Metadata={
  title:'ChatHub – Projekt Rendszerező',
  description:'ChatGPT projektek és beszélgetések egy helyen',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/icon.svg',apple:'/icon.svg'}
};

export const viewport:Viewport={
  themeColor:'#07111d',width:'device-width',initialScale:1,viewportFit:'cover'
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="hu"><body>{children}</body></html>;
}
