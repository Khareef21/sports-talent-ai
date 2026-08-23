import React from 'react';
import AppIcon from '../components/ui/AppIcon';

function Error({ statusCode, title }) {
  return (
    <div className="min-h-screen bg-[#06121a] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="kp-card p-8 max-w-md w-full">
        <div className="mb-3"><AppIcon name="warning" size={34} className="mx-auto text-[#ffc75b]" /></div>
        <h1 className="text-2xl font-black mb-2">
          {statusCode ? `Error ${statusCode}` : 'An Error Occurred'}
        </h1>
        <p className="text-sm text-[#a1afc7] mb-6">
          {title || (statusCode ? `A server error ${statusCode} occurred.` : 'An error occurred on the client.')}
        </p>
        <button
          onClick={() => window.location.assign('/')}
          className="kp-button py-2.5 px-5 text-sm w-full"
        >
          Return to Athlete Dashboard
        </button>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
