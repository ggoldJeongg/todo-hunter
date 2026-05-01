"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/common/tabs";
import './Navigation.css';
import { MENUS } from "@/constants/menu";
import { useUserStore } from "@/utils/stores/userStore";

interface NavigationProps {
  selectedMenu?: string;
  className?: string;
}

// <Navigation selectedMenu="선택된 메뉴명" className="custom-class" /> 이렇게 사용 가능

const Navigation: React.FC<NavigationProps> = ({
  selectedMenu = "character",
  className = "",
}) => {
  const router = useRouter();
  const endingState = useUserStore((state) => state.endingState);
  const fetchEndingState = useUserStore((state) => state.fetchEndingState);

  // 평일 여부 — SSR/hydration 안전하게 mount 후에만 결정
  const [isWeekday, setIsWeekday] = useState(false);
  useEffect(() => {
    setIsWeekday(new Date().getDay() !== 0); // 0 = 일요일
  }, []);

  useEffect(() => {
    fetchEndingState();
  }, [fetchEndingState]);

  const handleTabChange = (value: string) => {
    router.push(`/play/${value}`); // URL 변경
  };

  const isEndingDisabled = (menu: string) => {
    if (menu === "ending") {
      // endingState=2 (ENABLED) 또는 3 (CHECKED, 재확인 가능)일 때 활성화
      return endingState !== 2 && endingState !== 3;
    }
    return false;
  };

  // "일요일 공개" 배지 표시 조건: 엔딩 메뉴 + 잠금 상태 + 평일
  const showSundayBadge = (menu: string) =>
    menu === "ending" &&
    endingState !== 2 &&
    endingState !== 3 &&
    isWeekday;

  return (
    <div className={`${className}`}>
      <Tabs
        defaultValue={selectedMenu}
        onValueChange={handleTabChange}
        className={`w-full ${className}`}
      >
        <TabsList
          className="
          is-rounded-navi
          flex
          relative
          justify-between
          h-full
          max-[300px]:h-[66px]
          mt-[-2px] mb-[-2px] ml-[4px] mr-[4px]
      "
        >
          {/* 왼쪽 그룹 */}
          <div className="flex justify-evenly relative w-full left-[-4px]">
            {MENUS.slice(0, 2).map(({ menu, icon, label, disabled }) => (
              <TabsTrigger
                key={menu}
                className={`
                is-rounded-navi flex flex-col px-0 pt-2 pb-1
                max-[430px]:min-w-[40px] h-[60px] max-[300px]:h-[56px]
                min-[430px]:pl-4 min-[430px]:pr-4
                ${selectedMenu === menu ? `pt-1 pb-0` : `pb-1`}
              `}
                value={menu}
                disabled={disabled}
              >
                <div className="icon flex justify-center items-start h-8 max-[300px]:h-7 min-[430px]:pb-2">
                  <i
                    className={`hn ${
                      selectedMenu === menu ? `hn-${icon}-solid` : `hn-${icon}`
                    } text-[24px]`}
                  ></i>
                </div>
                <span className="pt-1 text-xs min-[430px]:text-sm">
                  {(Array.isArray(label) ? label : [label]).map(
                    (text, brIndex) => (
                      <React.Fragment key={brIndex}>
                        {text}
                        {brIndex !==
                          (Array.isArray(label) ? label.length - 1 : 0) && (
                          <br className="hidden max-[430px]:block" />
                        )}
                      </React.Fragment>
                    )
                  )}
                </span>
              </TabsTrigger>
            ))}
          </div>

          {/* 중앙 (something) */}
          <div className="flex relative min-w-[100px] max-[430px]:min-w-[80px] max-[300px]:min-w-[70px]">
            {MENUS[2] && (
              <TabsTrigger
                key={MENUS[2].menu}
                className={`round-button flex flex-col justify-center items-center absolute left-1/2 -translate-x-1/2 -translate-y-1/2
                min-w-[100px] max-[430px]:min-w-[90px] max-[300px]:w-[80px]
                h-[100px] max-[300px]:h-[80px] max-[430px]:pt-3 border-transparent
                data-[state=active]:bg-transparent data-[state=active]:text-white
                ${
                  selectedMenu === MENUS[2].menu
                    ? "bg-white"
                    : "transparent text-white"
                } text-lg sm:text-base`}
                value={MENUS[2].menu}
              >
                <div className="pixel-wrapper">
                  <div className="pixel"></div>
                  <div className="pixel"></div>
                  <div className="pixel"></div>
                </div>
                <div className="icon flex justify-center items-start h-9 max-[430px]:h-7">
                  <i
                    className={`hn ${
                      selectedMenu === MENUS[2].menu
                        ? `hn-${MENUS[2].icon}-solid`
                        : `hn-${MENUS[2].icon}`
                    } text-[26px] min-[430px]:text-[30px]`}
                  ></i>
                </div>
                <span className="text-[16px] max-[430px]:text-[14px]">
                  {MENUS[2].label}
                </span>
              </TabsTrigger>
            )}
          </div>

          {/* 오른쪽 그룹 */}
          <div className="flex justify-evenly relative w-full right-[-4px]">
            {MENUS.slice(3, 5).map(({ menu, icon, label }) => (
              <TabsTrigger
                key={menu}
                className={`
                relative
                is-rounded-navi flex flex-col px-0 pt-2 pb-1
                max-[430px]:min-w-[40px] h-[60px] max-[300px]:h-[56px]
                min-[430px]:pl-4 min-[430px]:pr-4
                ${selectedMenu === menu ? `pt-1 pb-0` : `pb-1`}
              `}
                value={menu}
                disabled={isEndingDisabled(menu)}
              >
                {/* 일요일 공개 말풍선 배지 — 엔딩 메뉴 잠금 + 평일에만 */}
                {showSundayBadge(menu) && (
                  <span
                    className="
                      absolute -top-3 left-1/2 -translate-x-1/2 z-10
                      whitespace-nowrap pointer-events-none
                      bg-[#C84B3A] text-white
                      text-[9px] font-extrabold tracking-wide
                      px-2 py-0.5 rounded-full
                      border-2 border-white
                      shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                    "
                  >
                    일요일 공개
                    {/* 말풍선 꼬리 — 아래쪽 삼각형 */}
                    <span
                      className="
                        absolute -bottom-[5px] left-1/2 -translate-x-1/2
                        w-0 h-0
                        border-l-[5px] border-r-[5px] border-t-[5px]
                        border-l-transparent border-r-transparent border-t-[#C84B3A]
                      "
                    />
                  </span>
                )}

                <div className="icon flex justify-center items-start h-8 max-[300px]:h-7 min-[430px]:pb-2">
                  <i
                    className={`hn ${
                      selectedMenu === menu ? `hn-${icon}-solid` : `hn-${icon}`
                    } text-[24px]`}
                  ></i>
                </div>
                <span className="pt-1 text-xs min-[430px]:text-sm">
                  {(Array.isArray(label) ? label : [label]).map(
                    (text, brIndex) => (
                      <React.Fragment key={brIndex}>
                        {text}
                        {brIndex !==
                          (Array.isArray(label) ? label.length - 1 : 0) && (
                          <br className="hidden max-[430px]:block" />
                        )}
                      </React.Fragment>
                    )
                  )}
                </span>
              </TabsTrigger>
            ))}
          </div>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default Navigation;
