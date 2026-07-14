import { EditModeProvider } from './contexts/EditModeContext';
import { WidgetProvider } from './contexts/WidgetContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Grid from './components/Layout/Grid';
import Background from './components/Background/Background';
import DevPanel from './components/DevPanel/DevPanel';

export default function App() {
  return (
    <BackgroundProvider>
      <SettingsProvider>
        <ThemeProvider>
          <EditModeProvider>
            <WidgetProvider>
              <Background />
              <Grid />
              <DevPanel />
            </WidgetProvider>
          </EditModeProvider>
        </ThemeProvider>
      </SettingsProvider>
    </BackgroundProvider>
  );
}
