import Head from "next/head";

const DefaultLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Head>
        <title>In Depo Veritas</title>
      </Head>
      <main>{children}</main>
    </>
  );
};

export default DefaultLayout;
