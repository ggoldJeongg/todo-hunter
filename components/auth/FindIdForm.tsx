import { LoginError } from "@/application/usecases/auth/errors/LoginError";
import { Button, Input } from "@/components/common";
import { useState } from "react";

const FindIdForm = ({ onFindId, onError }: { onFindId: (id: string) => void, onError: (error: string) => void }) => {
    const handleBack = () => {
        window.history.back();
    };
    
    const [email, setEmail] = useState("");

    const handleSubmit = async () => {
        if (!email) {
            alert("이메일을 입력하세요.");
            return;
        }

        try {
            const response = await fetch('/api/auth/find-login-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new LoginError("LOGIN_ID_NOT_FOUND", "아이디를 찾을 수 없습니다.");
                }
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            const loginId = data.loginId;
            onFindId(loginId);
        } catch (error) {
            if (error instanceof LoginError) {
                onError(error.message);
            } else {
                console.error("Error fetching login ID:", error);
            }
        }
    };
    
    return (
        <>
        <div className="w-full max-w-[320px] mt-[30px]">
            <Input
                placeholder="이메일"
                className="is-rounded-form w-full shadow-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
        </div>
        <div className="flex flex-col items-center gap-2 mt-[60px] w-full">
            <Button className="w-full max-w-[320px]" state="warning" size="L" onClick={handleBack}>뒤로 가기</Button>
            <Button className="w-full max-w-[320px]" state="success" size="L" onClick={handleSubmit}>아이디 찾기</Button>
        </div>
        </>
    );
}

export default FindIdForm;