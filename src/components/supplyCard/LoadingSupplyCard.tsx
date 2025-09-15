import { type FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Skeleton, Typography } from "@mui/material";
import { DisplayMenu } from "../menu/DisplayMenu";

export const LoadingSupplyCard: FC = () => {

return <CardTemplate className={'grid grid-flow-col grid-cols-5 h-18 items-center justify-items-center md:content-center md:grid-cols-10 gap-4 mt-5 px-4'}>
    <Box className="w-full col-span-2 justify-center hidden md:block">
        <Typography className="text-2xl font-semibold"><Skeleton/></Typography>
        <Typography className="text-sm text-gray-500 justify-center" ><Skeleton/></Typography>
    </Box>
    <Box className='w-full  col-span-3 md:col-span-3 md:col-start-3 justify-self-start'>
        <Typography className="text-lg font-semibold ml-4 md:ml-0"><Skeleton/></Typography>
        <Typography className="text-sm ml-4 md:ml-0"><Skeleton/></Typography>
    </Box>
    <Box className='w-full  col-span-3 justify-self-start hidden md:block'>
        <Skeleton/>
        <Skeleton/>
    </Box>
    <Box className='w-full  justify-self-end md:self-center'>
        <Skeleton/>
        <Typography className="text-sm text-gray-500 text-center md:hidden"><Skeleton/></Typography>
    </Box>
    <Box>
        <DisplayMenu supplyPointId="" code={""} disableSupplyPoint={() => {}} disableSuccess={false}/>
    </Box>
</CardTemplate>
}
