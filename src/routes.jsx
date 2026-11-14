// Every screen, by path.
import Reception from './pages/reception/Reception.jsx';
import Today from './pages/reception/Today.jsx';
import OnlineAppointments from './pages/reception/OnlineAppointments.jsx';
import Triage from './pages/triage/Triage.jsx';
import DoctorQueue from './pages/doctor/DoctorQueue.jsx';
import Consultation from './pages/doctor/Consultation.jsx';
import DoctorPatients from './pages/doctor/DoctorPatients.jsx';
import DoctorPatientRecord from './pages/doctor/DoctorPatientRecord.jsx';
import LabWorklist from './pages/lab/LabWorklist.jsx';
import Procedures from './pages/procedures/Procedures.jsx';
import DispenseQueue from './pages/pharmacy/DispenseQueue.jsx';
import Dispense from './pages/pharmacy/Dispense.jsx';
import Stock from './pages/pharmacy/Stock.jsx';
import ReceiveStock from './pages/pharmacy/ReceiveStock.jsx';
import Awaiting from './pages/cashier/Awaiting.jsx';
import TakePayment from './pages/cashier/TakePayment.jsx';
import Outstanding from './pages/cashier/Outstanding.jsx';
import Bills from './pages/billing/Bills.jsx';
import BillDetail from './pages/billing/BillDetail.jsx';
import Claims from './pages/billing/Claims.jsx';
import PriceList from './pages/admin/PriceList.jsx';
import Hmos from './pages/admin/Hmos.jsx';
import Clinics from './pages/admin/Clinics.jsx';
import Staff from './pages/admin/Staff.jsx';
import Import from './pages/admin/Import.jsx';
import Reports from './pages/admin/Reports.jsx';
import Audit from './pages/admin/Audit.jsx';

export const routes = [
  { path: '/reception', element: <Reception /> },
  { path: '/reception/today', element: <Today /> },
  { path: '/reception/appointments', element: <OnlineAppointments /> },
  { path: '/triage', element: <Triage /> },
  { path: '/doctor', element: <DoctorQueue /> },
  { path: '/doctor/patients', element: <DoctorPatients /> },
  { path: '/doctor/patients/:patientId', element: <DoctorPatientRecord /> },
  { path: '/doctor/visit/:visitId', element: <Consultation /> },
  { path: '/lab', element: <LabWorklist /> },
  { path: '/lab/done', element: <LabWorklist done key="done" /> },
  { path: '/procedures', element: <Procedures /> },
  { path: '/pharmacy', element: <DispenseQueue /> },
  { path: '/pharmacy/visit/:visitId', element: <Dispense /> },
  { path: '/pharmacy/stock', element: <Stock /> },
  { path: '/pharmacy/receive', element: <ReceiveStock /> },
  { path: '/cashier', element: <Awaiting /> },
  { path: '/cashier/bill/:visitId', element: <TakePayment /> },
  { path: '/cashier/outstanding', element: <Outstanding /> },
  { path: '/billing', element: <Bills /> },
  { path: '/billing/bill/:visitId', element: <BillDetail /> },
  { path: '/billing/claims', element: <Claims /> },
  { path: '/admin', element: <PriceList /> },
  { path: '/admin/hmos', element: <Hmos /> },
  { path: '/admin/clinics', element: <Clinics /> },
  { path: '/admin/staff', element: <Staff /> },
  { path: '/admin/import', element: <Import /> },
  { path: '/admin/reports', element: <Reports /> },
  { path: '/admin/audit', element: <Audit /> },
];
