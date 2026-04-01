const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

function isStrongPassword(password) {
  return PASSWORD_REGEX.test(password || "");
}

module.exports = { isStrongPassword };
