import { createSignal } from "solid-js";
import "./App.css";

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <main>
      <h1>vite-solid-template</h1>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Count is {count()}
      </button>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
    </main>
  );
}

export default App;
