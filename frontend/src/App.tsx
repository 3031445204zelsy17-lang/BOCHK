/** 智企通 App 根组件 — 路由配置 */

import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Wizard from "@/pages/Wizard"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wizard" element={<Wizard />} />
      </Routes>
    </BrowserRouter>
  )
}
