import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ColorModeProvider } from "./contexts/ColorMode";
import { Loading } from "./pages/Loading";
import { router } from "./router";

const App = () => {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <Suspense fallback={<Loading />}>
          <RouterProvider router={router} />
        </Suspense>
      </ColorModeProvider>
    </ErrorBoundary>
  );
};

export default App;
