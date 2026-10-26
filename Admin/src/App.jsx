import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './features/auth/components/LoginPage'

import Layout from './components/layout/Layout'
import Dashboard from './features/dashboard/Dashbaord'
import Category from './features/category/Category'
import Brand from './features/brand/Brand'
import Voucher from './features/voucher/Voucher'
import Plan from './features/plan/Plan'
import SubCategory from './features/subcategory/SubCategory'
import NewOnboarding from './features/newOnboarding/NewOnboarding'
import BrandWaiting from './features/newOnboarding/BrandWaiting'
import AnalyticsReport from './features/dashboard/Analyticsreport'
import CustomerPlan from './features/plan/Customerplan'
import VendorPlanAnalytics from './features/plan/Vendorplananalytics'
import CustomerPlanAnalytics from './features/plan/Customerplananalytics'
import Settlement from './features/settlement/Settlement'
import Customer from './features/customer/Customer'
import Transaction from './features/transaction/Transaction'
import TransactionDetails from './features/transaction/TransactionDetails'
import Refund from './features/refund/Refund'
import RefundDetails from './features/refund/RefundDetails'

import VoucherDetails from './features/voucher/VoucherDetails'
import VoucherListing from './features/voucher/VoucherList'
import BrandDetailsPage from './features/brand/BrandDetailsPage'
import AddBrand from './features/brand/add/AddBrand'
import AdminOnboarding from './features/onboarding/AdminOnboarding'
import { BrandProvider } from './features/brand/BrandContext'
import FeatureCampaign from './features/featurecampaign/page/FeatureCampaign'
import CouponCode from './features/coupon/Couponcode'
import Banner from './features/banner/Banner'
import BannerDetailsPage from './features/banner/BannerDetailsPage'
import PromotionalTicker from './features/promotionalTicker/PromotionalTicker'
import PromotionalTickerDetailsPage from './features/promotionalTicker/PromotionalTickerDetailsPage'
import Settings from './features/settings/Settings'
import PromoCode from './features/promoCode/PromoCode'
import PromoCodeReports from './features/promoCode/PromoCodeReports'
import Notification from './features/notification/Notification'
import Subscriptions from './features/subscriptions/Subscriptions'
import NotFoundPage from './components/common/NotFoundPage'
import Faq from './features/faq/Faq'
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
          path="/brand/expired"
          element={
            <Layout>
              <Brand key="expired" scope="expired" />
            </Layout>
          }
        />

        <Route
          path="/brand/dummy"
          element={
            <Layout>
              <Brand key="dummy" scope="dummy" />
            </Layout>
          }
        />

        <Route
          path="/brand/real-dummy"
          element={
            <Layout>
              <Brand key="real-dummy" scope="realDummy" />
            </Layout>
          }
        />

        <Route
          path="/brand/add"
          element={
            <Layout>
              <AddBrand />
            </Layout>
          }
        />

        <Route
          path="/brand/onboard"
          element={
            <Layout>
              <AdminOnboarding />
            </Layout>
          }
        />

        <Route
          path="/brand/onboard/:brandId"
          element={
            <Layout>
              <AdminOnboarding />
            </Layout>
          }
        />

        <Route
          path="/brand-waiting"
          element={
            <Layout>
              <BrandWaiting />
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
          path="/banner/:id"
          element={
            <Layout>
              <BannerDetailsPage />
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
          path="/promotional-ticker/:id"
          element={
            <Layout>
              <PromotionalTickerDetailsPage />
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
          path="/notifications"
          element={
            <Layout>
              <Notification />
            </Layout>
          }
        />

        <Route
          path="/subscriptions"
          element={
            <Layout>
              <Subscriptions key="all" />
            </Layout>
          }
        />

        <Route
          path="/subscriptions/dummy"
          element={
            <Layout>
              <Subscriptions key="dummy" scope="dummy" />
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
          path="/promo-code/reports"
          element={
            <Layout>
              <PromoCodeReports />
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
                path="/transaction/:claimId"
                element={
                  <Layout>
                    <TransactionDetails />
                  </Layout>
                }
              />

                 <Route
                path="/refund"
                element={
                  <Layout>
                    <Refund />
                  </Layout>
                }
              />

                 <Route
                path="/refund/:refundRequestId"
                element={
                  <Layout>
                    <RefundDetails />
                  </Layout>
                }
              />

                  <Route
                path="/vendor-listing"
                element={
                  <Layout>
                    <VoucherListing key="all" />
                  </Layout>
                }
              />

                  <Route
                path="/voucher-expired"
                element={
                  <Layout>
                    <VoucherListing key="expired" scope="expired" />
                  </Layout>
                }
              />

                  <Route
                path="/voucher-waiting"
                element={
                  <Layout>
                    <VoucherListing key="waiting" scope="waiting" />
                  </Layout>
                }
              />

                  <Route
                path="/voucher-drafts"
                element={
                  <Layout>
                    <VoucherListing key="draft" scope="draft" />
                  </Layout>
                }
              />

                  <Route
                path="/voucher-banners"
                element={
                  <Layout>
                    <VoucherListing key="banner" scope="banner" />
                  </Layout>
                }
              />

                  <Route
                path="/voucher-dummy"
                element={
                  <Layout>
                    <VoucherListing key="dummy" scope="dummy" />
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

                   <Route
                path="/faq"
                element={
                  <Layout>
                    <Faq />
                  </Layout>
                }
              />





        {/* koi bhi unknown route → common "Page not found" (Layout sends a
            logged-out user to login first) */}
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
      </BrandProvider>
    </BrowserRouter>
  )
}

export default App