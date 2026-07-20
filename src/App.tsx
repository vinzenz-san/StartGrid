import { EditModeProvider } from './contexts/EditModeContext';
import { WidgetProvider } from './contexts/WidgetContext';
import { GridConfigProvider } from './contexts/GridConfigContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Grid from './components/Layout/Grid';
import Background from './components/Background/Background';

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <BackgroundProvider>
          <EditModeProvider>
            <WidgetProvider>
              <GridConfigProvider>
                <Background />
                <Grid />
              </GridConfigProvider>
            </WidgetProvider>
          </EditModeProvider>
        </BackgroundProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
