import { createRoot } from 'react-dom/client';

const element = document.getElementById('root');
if (!element) throw new Error('Missing probe root');
createRoot(element).render(<main><h1>Phase 0 compatibility probe</h1><p>No application behavior is implemented.</p></main>);
