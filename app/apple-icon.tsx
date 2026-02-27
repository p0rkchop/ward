import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
          borderRadius: '36px',
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 'bold',
            color: 'white',
            marginTop: -8,
          }}
        >
          W
        </span>
      </div>
    ),
    { ...size }
  );
}
