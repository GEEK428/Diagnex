const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const env = require("./env");
const User = require("../models/User");

passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error, null);
  }
});

if (env.googleClientId && env.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email) return done(new Error("Google account email not available"));

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              name: profile.displayName || email.split("@")[0],
              email,
              role: "USER",
              enabled: true,
              oauthProvider: "google"
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

module.exports = passport;
