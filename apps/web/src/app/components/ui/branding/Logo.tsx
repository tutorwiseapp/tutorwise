import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({
  width = 180,
  height = 32,
  className = '',
  variant = 'full'
}) => {
  if (variant === 'icon') {
    return (
      <svg
        className={`${styles.logo} ${className}`}
        width={height}
        height={height}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Tutorwise"
      >
        <rect width="512" height="512" rx="10" fill="var(--color-primary, #006C67)"/>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M70 70L442 70L442 150L294 150L294 442L218 442L218 150L70 150Z M320 70C360 70 395 100 385 150C375 200 330 235 290 275C255 310 256 350 256 390C256 420 240 442 218 442L218 390C218 350 200 310 175 275C145 235 120 200 140 150C155 110 200 70 250 70L320 70Z"
          fill="white"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`${styles.logo} ${className}`}
      width={width}
      height={height}
      viewBox="0 0 1480 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tutorwise"
    >
      {/* TUTOR - Black */}
      <g className={styles.logoTutor}>
        {/* T */}
        <path d="M0 2L138 2L138 36L97 36L97 180L47 180L47 36L0 36L0 2Z" fill="currentColor"/>
        {/* U - shifted 5 units left */}
        <path d="M160 2L203 2L203 108C203 119 206 127 211 133C216 139 224 142 234 142C244 142 252 139 258 133C263 127 266 119 266 108L266 2L309 2L309 109C309 125 306 138 299 149C292 160 283 168 272 174C260 180 248 182 234 182C220 182 208 180 196 174C185 169 176 160 170 149C163 138 160 125 160 109L160 2Z" fill="currentColor"/>
        {/* T */}
        <path d="M329 2L467 2L467 36L426 36L426 180L376 180L376 36L329 36L329 2Z" fill="currentColor"/>
        {/* O - shifted 3 more units right */}
        <path d="M576 182C559 182 544 178 530 170C516 162 505 151 497 137C489 123 485 107 485 90C485 73 489 57 497 43C505 29 516 18 530 10C544 2 559 -2 576 -2C593 -2 608 2 622 10C636 18 647 29 655 43C663 57 667 73 667 90C667 107 663 123 655 137C647 151 636 162 622 170C608 178 593 182 576 182ZM576 142C590 142 601 137 610 128C619 118 623 106 623 90C623 74 619 62 610 53C601 43 590 39 576 39C562 39 551 43 542 53C533 62 529 74 529 90C529 106 533 118 542 128C551 137 562 142 576 142Z" fill="currentColor"/>
        {/* R - shifted 3 units right */}
        <path d="M772 180L735 113L725 113L725 180L682 180L682 2L755 2C769 2 781 4 791 10C801 15 808 22 813 31C818 40 821 49 821 60C821 72 818 82 811 92C804 101 794 107 781 111L821 180L772 180ZM725 82L752 82C760 82 766 80 770 76C774 72 776 67 776 60C776 53 774 48 770 44C766 40 760 38 752 38L725 38L725 82Z" fill="currentColor"/>
      </g>

      {/* WISE - Teal - shifted 5 units right total */}
      <g className={styles.logoWise}>
        {/* W */}
        <path d="M1091 2L1045 180L992 180L964 63L935 180L882 180L837 2L883 2L909 132L941 2L989 2L1019 132L1045 2L1091 2Z" fill="var(--color-primary, #006C67)"/>
        {/* I */}
        <path d="M1149 2L1149 180L1106 180L1106 2L1149 2Z" fill="var(--color-primary, #006C67)"/>
        {/* S */}
        <path d="M1236 182C1223 182 1211 180 1201 176C1191 172 1183 165 1177 157C1171 148 1168 138 1167 127L1213 127C1214 133 1216 138 1220 142C1224 145 1229 147 1235 147C1242 147 1247 145 1251 142C1255 139 1256 135 1256 130C1256 126 1255 122 1252 119C1249 116 1245 114 1241 112C1237 110 1231 108 1223 106C1212 102 1202 98 1195 95C1188 91 1182 86 1177 79C1171 72 1168 63 1168 52C1168 36 1174 23 1186 13C1198 4 1214 -1 1233 -1C1252 -1 1268 4 1280 13C1292 23 1299 36 1299 53L1252 53C1252 47 1250 43 1246 39C1242 36 1237 34 1231 34C1226 34 1222 35 1219 38C1216 41 1214 45 1214 50C1214 56 1217 60 1222 63C1228 66 1236 70 1248 73C1259 77 1269 81 1276 84C1283 88 1290 93 1295 100C1300 107 1302 116 1302 127C1302 137 1299 146 1294 154C1289 162 1282 169 1272 174C1262 179 1250 182 1236 182Z" fill="var(--color-primary, #006C67)"/>
        {/* E - shifted 2 more units left */}
        <path d="M1363 36L1363 71L1421 71L1421 105L1363 105L1363 144L1429 144L1429 180L1320 180L1320 2L1429 2L1429 36L1363 36Z" fill="var(--color-primary, #006C67)"/>
      </g>
    </svg>
  );
};

export default Logo;
