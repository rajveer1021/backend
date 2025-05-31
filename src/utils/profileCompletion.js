const checkProfileCompletion = (vendor) => {
    const steps = {
      step1: !!vendor.vendorType,
      step2: !!(
        vendor.businessName &&
        vendor.businessAddress1 &&
        vendor.city &&
        vendor.state &&
        vendor.postalCode
      ),
      step3: !!(vendor.gstNumber || vendor.gstDocument),
    };
  
    const completedSteps = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
  
    return {
      steps,
      completedSteps,
      totalSteps,
      completionPercentage,
      isComplete: completedSteps === totalSteps,
      currentStep: completedSteps + 1 > totalSteps ? totalSteps : completedSteps + 1,
    };
  };
  
  module.exports = { checkProfileCompletion };