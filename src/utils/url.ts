export function validateURL(inputString: string) {
  const re =
    /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

  return re.test(inputString);
}

export function getDomainFromEmail(email: string) {
  //example@something.com
  //[0]  - separator - domain
  const emailArray = email.split("@");

  return emailArray[1];
}
