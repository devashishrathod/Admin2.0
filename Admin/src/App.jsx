import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import LoginPage from './features/auth/components/LoginPage'
import BeforeWeStart from './features/auth/components/RegisterPage'
import SetupAccount from './features/auth/components/SetupAccount'
import SubscriptionPlan from './features/subscriptionPlan/SubscriptionPlan'
import OnboardingPage from './features/onboarding/pages/VendorOnboarding'
import Step3BusinessName from './features/onboarding/steps/Step3BusinessName'
import Step4IsRegistered from './features/onboarding/steps/Step4IsRegistered'
import Step5BusinessType from './features/onboarding/steps/Step5BusinessType'
import Step6PANEnter from './features/onboarding/steps/Step6PANEnter'
import Step8GSTEnter from './features/onboarding/steps/Step8GSTEnter'
import Step1WhatsApp from './features/onboarding/steps/Step1WhatsApp'
import Step10SystemVerify from './features/onboarding/steps/Step10SystemVerify'
import Step11BankEnter from './features/onboarding/steps/Step11BankEnter'
import Step13Complete from './features/onboarding/steps/Step13Complete'
 import Step14PartnerContract from './features/onboarding/steps/Step14PartnerContract'



// import HomePage from './components/HomePage'   // aapka next page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* "/" khulte hi LoginPage dikhega */}
   
           <Route path="/" element={<Step1WhatsApp />} />
           {/* step 1 */}
           {/* onbaording */}
           <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/step1" element={<Step1WhatsApp />} />

           {/* onboarding/step3 */}
           <Route path="/onboarding/step3" element={<Step3BusinessName  />} />
           {/* Step4IsRegistered */}
           <Route path="/onboarding/step4" element={<Step4IsRegistered />} />
           {/* Step5BusinessType */}
           <Route path="/onboarding/step5" element={<Step5BusinessType />} />
           {/* Step6PANEnter */}
           <Route path="/onboarding/step6" element={<Step6PANEnter />} />
           {/* Step8GSTEnter */}
           <Route path="/onboarding/step8" element={<Step8GSTEnter />} />
          
            {/* sysytemVerify */}
              <Route path="/onboarding/step10" element={<Step10SystemVerify />} />
              {/* Step11BankEnter */}
              <Route path="/onboarding/step11" element={<Step11BankEnter />} />

              {/* Step13Complete */}
              <Route path="/onboarding/step13" element={<Step13Complete />} />

               {/*  partenrContact*/}
            <Route path="/onboarding/step14" element={<Step14PartnerContract />} />

        <Route path="/register" element={<BeforeWeStart />} />
        {/* steps */}
        <Route path="/setup" element={<SetupAccount />} />   
        {/* subscription plan */}
        <Route path="/subscription" element={<SubscriptionPlan />} />

      
        



        {/* koi bhi unknown route → Login pe bhejo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App