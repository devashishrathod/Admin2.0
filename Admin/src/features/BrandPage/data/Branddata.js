// Branddata.js
// Static/mock data for the Brand Profile page.
// In production this would typically come from the API (see services/brandApi.js),
// but this file is useful as a fallback / for local development & testing.

const Branddata = {
  merchantToken: "A4FGIWJOIUN20",
  brandName: "Yoga Education And Research Pvt Ltd",
  shortName: "Andiappan Yoga Academy",
  brandLogo: {
    fileName: "Logo.jpg",
    url: "",
  },
  mailId: "YogaEducationResearchgt@gmail.com",
  mobileNo: "+91 9876501234",
  referCode: "745LJ1H1BG558",
  joining: "Live On Trydood Since 2026",

  category: {
    mainCategory: "Fitness Studio",
    subCategory: "Yoga Center",
  },

  categoryTagLine: {
    helperText: "Pick sub-category tags to discover what you need faster.",
    tags: [
      { id: "01", label: "Woman" },
      { id: "02", label: "Men" },
      { id: "03", label: "Child" },
      { id: "04", label: "Old Person" },
    ],
  },

  outletLocation: {
    // Coordinates used to center the pin on the map.
    latitude: "13.7476133",
    longitude: "80.1919092",

    locationAndAddress: {
      mapPinLocationAddress:
        "1st Main Rd, R.V. Nagar, Block 1, Ammaingar Loel, Chennai, Tamil Nadu 600192",
      transactionAddress: "Anniengar Post, Chennai",
      latitude: "13.7476133",
      longitude: "80.1919092",
    },

    manualLocation: {
      outletManualAddress:
        "Flat No. 704, Door No. 29, Chandhika Arcade, 1st Main Rd, R.V. Nagar, Block 1, Ammaingar Loel, Chennai, Tamil Nadu 600192",
    },

    gstAddress: {
      address:
        "New No. 9 (Old No. 15), Plot No. 4253, 4th Floor, K Block 5th Street, Ammaingar West, Chennai - 600043",
    },

    accountSetupManager: {
      employeeId: "Emp-34091",
      employeeName: "Sanu.I",
      mobileNumber: "+91 9004624969",
      emailAddress: "Karthick@email.Com",
    },
  },

  showcase: {
    subtitle: "View and update your profile, settings, and account information.",
    guidelinesLink: "#",
    groups: [
      {
        id: "ambience",
        title: "Ambience Images & Video",
        subtitle:
          "Ensure images follow our event card guidelines and are provided in both formats.",
        imageDetails: {
          aspectRatio: "3:4 aspect ratio (50px by 50px)",
          uploadSizeLimit: "1.5MB",
        },
        videoDetails: {
          size: "3:4 Size (900px by 1200px)",
          uploadSizeLimit: "5MB",
          format: "Gif or mp4",
          duration: "10 to 60 secs",
        },
      },
      {
        id: "gallery",
        title: "Gallery Images & Video",
        subtitle:
          "Ensure images follow our event card guidelines and are provided in both formats.",
        imageDetails: {
          aspectRatio: "3:4 aspect ratio (50px by 50px)",
          uploadSizeLimit: "1.5MB",
        },
        videoDetails: {
          size: "3:4 Size (900px by 1200px)",
          uploadSizeLimit: "5MB",
          format: "Gif or mp4",
          duration: "10 to 60 secs",
        },
      },
      {
        id: "menu",
        title: "Menu Images & Video",
        subtitle:
          "Ensure images follow our event card guidelines and are provided in both formats.",
        imageDetails: {
          aspectRatio: "3:4 aspect ratio (50px by 50px)",
          uploadSizeLimit: "1.5MB",
        },
        videoDetails: {
          size: "3:4 Size (900px by 1200px)",
          uploadSizeLimit: "5MB",
          format: "Gif or mp4",
          duration: "10 to 60 secs",
        },
      },
      {
        id: "sept-event",
        title: "Sept Month Event Images & Video",
        subtitle:
          "Ensure images follow our event card guidelines and are provided in both formats.",
        imageDetails: {
          aspectRatio: "3:4 aspect ratio (50px by 50px)",
          uploadSizeLimit: "1.5MB",
        },
        videoDetails: {
          size: "3:4 Size (900px by 1200px)",
          uploadSizeLimit: "5MB",
          format: "Gif or mp4",
          duration: "10 to 60 secs",
        },
      },
    ],
  },

  bankAccountDetails: {
    subtitle: "Your bank account helps ensure your settlement amount is processed on time.",
    activeAccountSubtitle:
      "This is the bank account where settlements are processed and collected payments will be deposited in",
    accounts: [
      {
        id: "acc-1",
        bankName: "kotak mahindra bank",
        isPrimary: true,
        nameOnAccount: "Yoga Education And Research Pvt Ltd",
        accountNumber: "123409764790841",
        ifscCode: "KMKB0080106",
      },
      {
        id: "acc-2",
        bankName: "Au small finance bank",
        isPrimary: false,
        nameOnAccount: "Yoga Education And Research Pvt Ltd",
        accountNumber: "265689740014525",
        ifscCode: "AUBL0002556",
      },
    ],
  },

  listingFeatures: {
    subtitle: "Improve reach and engagement with better presentation.",
    features: [
      { id: "1", sNo: "01", iconFileName: "Air.PNG", lfName: "Air Conditioned", createdOn: "02 Month Ago" },
      { id: "2", sNo: "02", iconFileName: "Lift.PNG", lfName: "Elevator in building", createdOn: "02 Month Ago" },
      { id: "3", sNo: "03", iconFileName: "Air.PNG", lfName: "Waiting Room", createdOn: "One Week Ago" },
      { id: "4", sNo: "04", iconFileName: "Lift.PNG", lfName: "Wheelchair - Access", createdOn: "6Hrs Ago" },
      { id: "5", sNo: "05", iconFileName: "Lift.PNG", lfName: "Accessible washrooms", createdOn: "01 Day Ago" },
      { id: "6", sNo: "06", iconFileName: "Air.PNG", lfName: "Free Wi Fi", createdOn: "Six Month Ago" },
      { id: "7", sNo: "07", iconFileName: "Lift.PNG", lfName: "Free Valet Parking", createdOn: "One Year Ago" },
    ],
  },

  gstPanInformation: {
    subtitle: "GST & PAN Verification Helps Your Business Grow",
    brandName: "Yoga Education And Research Pvt Ltd",
    address:
      "New No. 9 (Old No. 23), Plot No. 4363, 4th Floor, X Block 5th Street, Annanagar West, Chennai - 600040",
    gstin: "09AAKFF2211N2ZA",
    panDetails: "AAKFF2211N",
    taxpayerType: "Regular",
    gstStatus: "Active",
  },
};

export default Branddata;
