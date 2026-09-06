import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {MemoaApp} from './src/MemoaApp';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <MemoaApp />
    </SafeAreaProvider>
  );
}

export default App;
