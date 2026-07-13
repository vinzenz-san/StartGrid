import { EditModeProvider } from './contexts/EditModeContext';
import { WidgetProvider } from './contexts/WidgetContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import Grid from './components/Layout/Grid';
import Background from './components/Background/Background';
import DevPanel from './components/DevPanel/DevPanel';

export default function App() {
  return (
    <BackgroundProvider>
      <EditModeProvider>
        <WidgetProvider>
          <Background />
          <Grid />
          <DevPanel />
        </WidgetProvider>
      </EditModeProvider>
    </BackgroundProvider>
  );
}
