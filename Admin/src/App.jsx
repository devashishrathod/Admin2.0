import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/components/LoginPage'

import Layout from './components/layout/Layout'
import Dashboard from './features/dashboard/Dashbaord'
import Category from './features/category/Category'
import Brand from './features/brand/Brand'
import Voucher from './features/voucher/Voucher'
import Plan from './features/plan/Plan'
import SubCategory from './features/subcategory/SubCategory'
import NewOnboarding from './features/newOnboarding/NewOnboarding'
import AnalyticsReport from './features/dashboard/Analyticsreport'
import CustomerPlan from './features/plan/Customerplan'
import VendorPlanAnalytics from './features/plan/Vendorplananalytics'
import CustomerPlanAnalytics from './features/plan/Customerplananalytics'
import Settlement from './features/settlement/Settlement'
import Customer from './features/customer/Customer'
import Transaction from './features/transaction/Transaction'

import VoucherDetails from './features/voucher/VoucherDetails'
import VoucherListing from './features/voucher/VoucherList'
import BrandDetailsPage from './features/brand/BrandDetailsPage'
import { BrandProvider } from './features/brand/BrandContext'
import FeatureCampaign from './features/featurecampaign/page/FeatureCampaign'
import CouponCode from './features/coupon/Couponcode'
import Banner from './features/banner/Banner'
import PromotionalTicker from './features/promotionalTicker/PromotionalTicker'
import Settings from './features/settings/Settings'
import PromoCode from './features/promoCode/PromoCode'
// import BrandPage from './features/BrandPage'
// import LoginPage from './features/auth/components/LoginPage'



// import HomePage from './components/HomePage'   // aapka next page

function App() {
  return (
    <BrowserRouter>
      <BrandProvider>
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
              <NewOnboarding />
            </Layout>
          }
        />

         <Route
          path="/brands/:id"
          element={
            <Layout>
              < BrandDetailsPage />
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
          path="/banner"
          element={
            <Layout>
              <Banner />
            </Layout>
          }
        />

        <Route
          path="/promotional-ticker"
          element={
            <Layout>
              <PromotionalTicker />
            </Layout>
          }
        />

        <Route
          path="/settings"
          element={
            <Layout>
              <Settings />
            </Layout>
          }
        />

        <Route
          path="/promo-code"
          element={
            <Layout>
              <PromoCode />
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

                  <Route
                path="/vendor-listing"
                element={
                  <Layout>
                    <VoucherListing />
                  </Layout>
                }
              />

                  <Route
                path="/v"
                element={
                  <Layout>
                    <VoucherDetails />
                  </Layout>
                }
              />

                   <Route
                path="/feature_campaign"
                element={
                  <Layout>
                    <FeatureCampaign />
                  </Layout>
                }
              />

                   <Route
                path="/coupon"
                element={
                  <Layout>
                    <CouponCode />
                  </Layout>
                }
              />





        {/* koi bhi unknown route → Login pe bhejo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </BrandProvider>
    </BrowserRouter>
  )
}

export default App