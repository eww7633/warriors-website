export const siteConfig = {
  publicSite: {
    baseUrl: process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://pghwarriorhockey.us"
  },
  social: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com/pittsburghwarriorshockey",
    facebook:
      process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com/pittsburghwarriors/"
  }
};
