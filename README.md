# Welding Shop-Floor Simulator

Industrial Automation, Multi-Cell Management & Sequential Production Execution Engine.

---

## 📚 Separated System Documentation

The complete architecture, operational workflows, and Low-Level Design (LLD) have been separated into dedicated documents:

1. **[Frontend Architecture, Workflow & LLD](file:///c:/Users/verma/OneDrive/Desktop/project%20x/FRONTEND_ARCHITECTURE_AND_LLD.md)**:
   - React 18 & TypeScript component tree
   - ShopFloorContext state store & WebSocket event dispatcher
   - 60 FPS HTML5 Canvas kinematic welding visualizer
   - User workflows (Cell creation Option A/B, queue reordering, barcode terminal)
   - Universal industrial CSS design tokens and responsive breakpoints

2. **[Backend Architecture, Workflow & LLD](file:///c:/Users/verma/OneDrive/Desktop/project%20x/BACKEND_ARCHITECTURE_AND_LLD.md)**:
   - Fastify REST server & WebSocket broadcasting engine
   - ProductionQueueEngine sequential execution state machine
   - EquipmentManager hardware reservation locks & availability pool
   - WeldingSimulationEngine (100ms telemetry tick with realistic electrical noise)
   - Panasonic controller CSV writer (WELDEVLOG, OPREVLOG, 8-line header Waveform files)
   - WAMP client service for `/barcode` topic publishing

---

## 🚀 How to Run the Project

### 1. Start Backend Server
```powershell
cd "c:\Users\verma\OneDrive\Desktop\project x\backend"
npm run dev
```
- REST API: `http://localhost:3001`
- WebSocket Server: `ws://localhost:3001/ws`

### 2. Start Frontend Dev Client
```powershell
cd "c:\Users\verma\OneDrive\Desktop\project x\frontend"
npm run dev
```
- Web Application: **[http://localhost:5173](http://localhost:5173)**
