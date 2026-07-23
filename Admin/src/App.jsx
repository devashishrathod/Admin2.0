import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/components/LoginPage'

import Layout from './components/layout/Layout'
import Dashboard from './features/dashboard/Dashbaord'
import Category from './features/category/Category'
import Brand from './features/brand/Brand'
import Voucher from './features/voucher/Voucher'
import Plan from './features/plan/Plan'
import SubCategory from './features/subcategory/SubCategory'
import NewOboarding from './features/brand/NewOboarding'
import AnalyticsReport from './features/dashboard/Analyticsreport'
import CustomerPlan from './features/plan/Customerplan'
import VendorPlanAnalytics from './features/plan/Vendorplananalytics'
import CustomerPlanAnalytics from './features/plan/Customerplananalytics'
import Settlement from './features/settlement/Settlement'
import Customer from './features/customer/Customer'
import Transaction from './features/transaction/Transaction'
// import LoginPage from './features/auth/components/LoginPage'




// import HomePage from './components/HomePage'   // aapka next page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* "/" khulte hi LoginPage dikhega */}

        <Route path="/" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />

        <Route
          path="/analytics"
          element={
            <Layout>
              <AnalyticsReport />
            </Layout>
          }
        />
        <Route
          path="/main-category"
          element={
            <Layout>
              <Category />
            </Layout>
          }
        />
        <Route
          path="/sub-category"
          element={
            <Layout>
              <SubCategory />
            </Layout>
          }
        />

        <Route
          path="/brand"
          element={
            <Layout>
              <Brand />
            </Layout>
          }
        />

        <Route
          path="/new-onboarding"
          element={
            <Layout>
              < NewOboarding />
            </Layout>
          }
        />

        <Route
          path="/assebility"
          element={
            <Layout>
              <Voucher />
            </Layout>
          }
        />

        <Route
          path="/vendor-plan"
          element={
            <Layout>
              <Plan />
            </Layout>
          }
        />

        <Route
          path="/user-plan"
          element={
            <Layout>
              <CustomerPlan />
            </Layout>
          }
        />

        <Route
          path="/analysis-report-customer"
          element={
            <Layout>
              <CustomerPlanAnalytics />
            </Layout>
          }
        />

        <Route
          path="/analysis-report-vendor"
          element={
            <Layout>
              <VendorPlanAnalytics />
            </Layout>
          }
        />

        <Route
          path="/settlements"
          element={
            <Layout>
              <Settlement />
            </Layout>
          }
        />


         <Route
                path="/customer"
                element={
                  <Layout>
                    <Customer />
                  </Layout>
                }
              />

                 <Route
                path="/transaction"
                element={
                  <Layout>
                    <Transaction />
                  </Layout>
                }
              />





        {/* koi bhi unknown route → Login pe bhejo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App