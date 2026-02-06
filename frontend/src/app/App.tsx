import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./components/home-page";
import { EditorPage } from "./components/editor-page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/doc/:documentId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
