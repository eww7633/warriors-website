export const siteConfig = {
  publicSite: {
    baseUrl: process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://pghwarriorhockey.us",
    links: {
      about: process.env.NEXT_PUBLIC_MAIN_LINK_ABOUT ?? "https://pghwarriorhockey.us/about",
      donate: process.env.NEXT_PUBLIC_MAIN_LINK_DONATE ?? "https://pghwarriorhockey.us/donate",
      partners: process.env.NEXT_PUBLIC_MAIN_LINK_PARTNERS ?? "https://pghwarriorhockey.us/partners",
      join: process.env.NEXT_PUBLIC_MAIN_LINK_JOIN ?? "https://pghwarriorhockey.us/join",
      events: process.env.NEXT_PUBLIC_MAIN_LINK_EVENTS ?? "https://pghwarriorhockey.us/events"
    }
  },
  social: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com/pittsburghwarriorshockey",
    facebook:
      process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com/pittsburghwarriors/"
  }
};
